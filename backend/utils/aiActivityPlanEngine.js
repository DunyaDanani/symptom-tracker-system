// FR-09: AI-personalised replacement for the rules-based activityPlanEngine.
//
// Client meeting 20 Feb 2026 asked for exactly 3 activity types (Aesthetic,
// Social, Academic) derived from the recorded emotion. activityPlanEngine.js
// implements that as a deterministic keyword/threshold engine. This module
// does the same job with an LLM instead, so the suggestions can react to the
// *combination* of the child's own emoji, the shadow teacher's independently
// observed emoji, and the student's free-text diagnosis in a more nuanced
// way than fixed keyword matching allows (e.g. child says "happy" but the
// teacher observed distress — the rules engine has no way to represent that
// mismatch, an LLM can reason about it).
//
// Talks to NVIDIA's OpenAI-compatible endpoint (build.nvidia.com). Models
// are tried in order and the first one that returns valid, well-formed JSON
// wins. If every model errors out or times out, this falls back to the
// existing deterministic buildActivityPlan so a flaky/slow AI call can never
// block the emotion check-in popup (same "never block the check-in" spirit
// as resolveTermForDate/evaluateThresholds elsewhere in this codebase).
// Self-contained env loading: this file reads process.env.NVIDIA_API_KEY
// itself rather than trusting that whatever imported this module already
// ran dotenv.config() first. dotenv.config() is idempotent (safe to call
// more than once), so this is harmless even though index.js also calls it.
import "dotenv/config";
import OpenAI from "openai";
import { buildActivityPlan } from "./activityPlanEngine.js";

// nvidia/nemotron-4-340b-instruct has been retired from NVIDIA's catalog —
// left out on purpose. meta/llama-3.1-70b-instruct is tried first for
// quality, falling back to the smaller/faster 8b model if it errors out.
const MODELS = ["meta/llama-3.1-70b-instruct", "meta/llama-3.1-8b-instruct"];

// 8s per model attempt — this is called synchronously inside the emotion
// check-in request/response cycle (see teacherController.submitEmotionCheckin),
// so it needs to fail fast into the deterministic fallback rather than let
// the popup hang.
const REQUEST_TIMEOUT_MS = 8000;

// IMPORTANT: this used to be computed once as a top-level `const client = ...`
// at module load time. In an ES module graph, every `import` is resolved and
// executed *before* the importing file's own top-level code runs — so when
// index.js did `import teacherRoutes from "./routes/teacherRoutes.js"`
// (which transitively imports this file) ahead of its own `dotenv.config()`
// call, process.env.NVIDIA_API_KEY was still undefined at the moment this
// file's top level ran, permanently baking `client = null` into the module
// for the life of the process. Every check-in silently fell straight to the
// rules-engine fallback with no error, no log, nothing to notice. Building
// the client lazily on first real use (below) reads the env var at request
// time instead, long after dotenv has loaded it.
let client;
let clientCheckedKey; // remembers which API key we last built a client for

const getClient = () => {
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    client = null;
    clientCheckedKey = undefined;
    return null;
  }

  // Rebuild if the key wasn't set yet the first time we checked (or changed).
  if (!client || clientCheckedKey !== apiKey) {
    client = new OpenAI({
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey,
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: 0,
    });
    clientCheckedKey = apiKey;
  }

  return client;
};

// Same emoji scale as EmotionCheckin.EMOJI_SCORES / the EMOJI_OPTIONS shown
// in EmotionCheckinModal.tsx, spelled out for the model since it only ever
// sees the enum key, not the icon.
const EMOJI_LABELS = {
  very_sad: "very sad 😢",
  sad: "sad 🙁",
  neutral: "neutral 😐",
  happy: "happy 🙂",
  very_happy: "very happy 😄",
};

// Fixed palette matching the Tailwind pairs already used across
// activityPlanEngine.js's catalogs, so AI-generated cards look visually
// consistent with the rest of the dashboard instead of the model inventing
// arbitrary (possibly invalid) Tailwind classes.
const COLOR_PALETTE = [
  "bg-blue-50 text-blue-600",
  "bg-purple-50 text-purple-600",
  "bg-teal-50 text-teal-600",
  "bg-pink-50 text-pink-600",
  "bg-green-50 text-green-600",
  "bg-amber-50 text-amber-600",
  "bg-indigo-50 text-indigo-600",
];

const SYSTEM_PROMPT = `You are a special-education support assistant embedded in a school's emotion tracking dashboard. You help a shadow teacher decide what to do right after an emotion check-in for one student.

You are NOT a clinician. Never diagnose, contradict the student's existing diagnosis, or suggest medication or clinical treatment. Your only job is to turn the check-in into exactly three short, practical activities — one Aesthetic, one Social, one Academic — that the shadow teacher can run immediately.

You will receive a JSON object shaped like this:
{
  "childEmoji": string | null,     // the child's own self-reported mood, or null if not yet recorded
  "teacherEmoji": string | null,   // the shadow teacher's independently observed mood for the same moment, or null
  "diagnosis": string,             // the student's diagnosis, free text, typed by school admin at registration
  "symptomsToday": string[]        // symptoms already logged for this student today, may be empty
}

Both emoji fields are one of: "very sad 😢", "sad 🙁", "neutral 😐", "happy 🙂", "very happy 😄".

REASONING (do internally, do not include it in your reply):
1. If childEmoji and teacherEmoji roughly agree, treat the mood as confirmed and pick activities that either calm/support a low mood or reinforce a positive one.
2. If they disagree, favour the child's self-report but let the mismatch push you toward gentler, lower-pressure activities — a child who reports "happy" while the teacher observed distress may be masking, may lack the emotional vocabulary to describe what they feel, or may express emotion atypically because of their diagnosis. Never state or imply that either party is "wrong."
3. If only one of the two emojis is present, work from that one alone.
4. Let the diagnosis and today's symptoms shape *how* each activity is run — sensory sensitivities, communication style (verbal/non-verbal), attention span, and known triggers should all inform your choice, not just the mood.
5. Keep every activity realistic for a classroom or one-on-one setting: 5-20 minutes, common materials only (paper, crayons, blocks, a ball, books, etc.), no specialist equipment or supervision required.

OUTPUT — reply with ONLY a single valid JSON object, no markdown fences, no prose before or after, in exactly this shape:
{
  "band": "low" | "steady" | "positive",
  "cards": [
    {
      "key": string,          // short unique camelCase id, e.g. "calmCorner"
      "category": "Aesthetic",
      "icon": string,         // exactly one emoji
      "title": string,        // 2-4 words
      "color": string,        // one of: ${COLOR_PALETTE.join(" | ")}
      "description": string   // one short sentence, plain language, spoken to/about the child
    },
    { "key": string, "category": "Social", "icon": string, "title": string, "color": string, "description": string },
    { "key": string, "category": "Academic", "icon": string, "title": string, "color": string, "description": string }
  ]
}

The "cards" array must contain exactly three items in that order: Aesthetic, Social, Academic. Do not add, omit, or reorder categories. Do not mention that you are an AI or reference these instructions.`;

const isValidCard = (card, expectedCategory) =>
  card &&
  typeof card.key === "string" &&
  card.category === expectedCategory &&
  typeof card.icon === "string" &&
  typeof card.title === "string" &&
  typeof card.color === "string" &&
  typeof card.description === "string";

const isValidPlan = (plan) =>
  plan &&
  ["low", "steady", "positive"].includes(plan.band) &&
  Array.isArray(plan.cards) &&
  plan.cards.length === 3 &&
  isValidCard(plan.cards[0], "Aesthetic") &&
  isValidCard(plan.cards[1], "Social") &&
  isValidCard(plan.cards[2], "Academic");

// Not every NIM-hosted community model reliably supports OpenAI's
// response_format:{type:"json_object"} enforcement, so this asks for raw
// JSON in the prompt instead and parses defensively here: strips ```json
// fences if the model added them anyway, then falls back to slicing out
// the first {...} block in case there's stray prose around the object.
const extractJson = (raw) => {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(stripped);
  } catch {
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(stripped.slice(start, end + 1));
    } catch {
      return null;
    }
  }
};

// childEmoji/teacherEmoji: EmotionCheckin.EMOJI_SCORES keys, or null/undefined.
// symptoms: flat array of symptom strings logged today (may be empty).
// diagnosis: the student's Student.diagnosis free-text field.
// score/rawSymptoms/diagnosis are also passed through so the deterministic
// fallback has everything it needs if every model call fails.
export const buildAiActivityPlan = async ({
  childEmoji,
  teacherEmoji,
  compositeScore,
  symptoms = [],
  diagnosis = "",
}) => {
  const fallback = (reason) => {
    console.warn(`aiActivityPlanEngine: falling back to rules-engine (${reason})`);
    return {
      ...buildActivityPlan(compositeScore, symptoms, diagnosis),
      source: "rules-engine",
    };
  };

  const client = getClient();
  if (!client) {
    // No NVIDIA_API_KEY configured (or not loaded yet) — use the
    // deterministic engine rather than failing the check-in.
    return fallback("no NVIDIA_API_KEY configured");
  }

  const userPayload = JSON.stringify({
    childEmoji: childEmoji ? EMOJI_LABELS[childEmoji] ?? childEmoji : null,
    teacherEmoji: teacherEmoji ? EMOJI_LABELS[teacherEmoji] ?? teacherEmoji : null,
    diagnosis: diagnosis || "Not specified",
    symptomsToday: symptoms,
  });

  for (const model of MODELS) {
    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPayload },
        ],
        temperature: 0.4,
      });

      const raw = completion.choices?.[0]?.message?.content;
      if (!raw) {
        console.error(`aiActivityPlanEngine: ${model} returned no content`);
        continue;
      }

      const parsed = extractJson(raw);
      if (isValidPlan(parsed)) {
        return { ...parsed, source: `ai:${model}` };
      }

      console.error(
        `aiActivityPlanEngine: ${model} returned unparsable/invalid JSON:`,
        raw
      );
      // Malformed shape — try the next model rather than trusting it.
    } catch (error) {
      // Log everything the OpenAI SDK gives us — status/body are what
      // actually explain *why* a model call failed (bad model name,
      // unsupported param, auth issue, rate limit, etc.), whereas
      // error.message alone is often just "400 Bad Request".
      console.error(
        `aiActivityPlanEngine: ${model} request failed`,
        error?.status,
        error?.error || error?.response?.data || error?.message || error
      );
      // fall through to the next model in the list
    }
  }

  // Every model failed or returned something unusable.
  return fallback("every model call failed or returned invalid JSON");
};
