// FR-09 / FR-12: derives a personalised, icon-based, colour-coded activity
// plan for the child dashboard from today's emotion check-in and today's
// logged symptoms.
//
// Client meeting 20 Feb 2026: "Based on the recorded emotion, the system
// should suggest 3 types of activities: Aesthetic, Social, and Academic."
// So this always returns exactly 3 cards — one per category — rather than
// a variable-length set.
//
// This is a deterministic rules engine — the same spirit as
// utils/alertEngine.js's threshold rules — rather than a trained ML model.

const AESTHETIC_CATALOG = {
  calmCorner: {
    key: "calmCorner",
    category: "Aesthetic",
    icon: "🧘",
    title: "Calm Corner",
    color: "bg-blue-50 text-blue-600",
    description: "Take a few slow breaths in a quiet, cozy spot.",
  },
  sensoryPlay: {
    key: "sensoryPlay",
    category: "Aesthetic",
    icon: "🎈",
    title: "Sensory Play",
    color: "bg-purple-50 text-purple-600",
    description: "Squeeze a stress ball or try some gentle sensory play.",
  },
  creativeTime: {
    key: "creativeTime",
    category: "Aesthetic",
    icon: "🎨",
    title: "Creative Time",
    color: "bg-teal-50 text-teal-600",
    description: "Draw, paint, or build something fun and colourful.",
  },
  freeDrawing: {
    key: "freeDrawing",
    category: "Aesthetic",
    icon: "🖍️",
    title: "Free Drawing",
    color: "bg-pink-50 text-pink-600",
    description: "Grab some crayons and draw whatever you like.",
  },
};

const SOCIAL_CATALOG = {
  storyTime: {
    key: "storyTime",
    category: "Social",
    icon: "📖",
    title: "Story Time",
    color: "bg-pink-50 text-pink-600",
    description: "Read or listen to a story together with a friend.",
  },
  buddyTime: {
    key: "buddyTime",
    category: "Social",
    icon: "🤝",
    title: "Buddy Time",
    color: "bg-purple-50 text-purple-600",
    description: "Spend some quiet one-on-one time with a friend.",
  },
  groupGame: {
    key: "groupGame",
    category: "Social",
    icon: "🎲",
    title: "Group Game",
    color: "bg-green-50 text-green-600",
    description: "Join a fun group game with your classmates.",
  },
};

const ACADEMIC_CATALOG = {
  gentleReview: {
    key: "gentleReview",
    category: "Academic",
    icon: "📝",
    title: "Gentle Review",
    color: "bg-amber-50 text-amber-600",
    description: "A light, easy review of something you already know well.",
  },
  focusGame: {
    key: "focusGame",
    category: "Academic",
    icon: "🧩",
    title: "Focus Game",
    color: "bg-amber-50 text-amber-600",
    description: "A short puzzle or matching game to build focus.",
  },
  challengePuzzle: {
    key: "challengePuzzle",
    category: "Academic",
    icon: "🧠",
    title: "Challenge Puzzle",
    color: "bg-indigo-50 text-indigo-600",
    description: "Try a trickier puzzle or brain teaser.",
  },
};

// Same low/positive score cutoffs the alert engine uses, so a day that
// would trigger FR-10's "low emotion score" alert also visibly steers the
// activity plan toward calmer, gentler options.
const LOW_SCORE_THRESHOLD = 2.5;
const POSITIVE_SCORE_THRESHOLD = 4;

const hasSymptom = (symptoms, match) =>
  symptoms.some((s) => s.includes(match));

const pickAesthetic = (band, symptoms) => {
  if (hasSymptom(symptoms, "Motor coordination or movement")) {
    return AESTHETIC_CATALOG.sensoryPlay;
  }
  if (
    band === "low" ||
    hasSymptom(symptoms, "Emotional or behavioral regulation")
  ) {
    return AESTHETIC_CATALOG.calmCorner;
  }
  if (band === "positive") return AESTHETIC_CATALOG.creativeTime;
  return AESTHETIC_CATALOG.freeDrawing;
};

const pickSocial = (band, symptoms) => {
  if (
    hasSymptom(symptoms, "Social interaction") ||
    hasSymptom(symptoms, "Communication difficulties")
  ) {
    return SOCIAL_CATALOG.buddyTime;
  }
  if (band === "positive") return SOCIAL_CATALOG.groupGame;
  return SOCIAL_CATALOG.storyTime;
};

const pickAcademic = (band, symptoms) => {
  if (band === "low") return ACADEMIC_CATALOG.gentleReview;
  if (
    hasSymptom(symptoms, "Difficulty paying attention") ||
    hasSymptom(symptoms, "Difficulty following instructions") ||
    hasSymptom(symptoms, "Difficulty completing tasks") ||
    hasSymptom(symptoms, "Learning or academic")
  ) {
    return ACADEMIC_CATALOG.focusGame;
  }
  if (band === "positive") return ACADEMIC_CATALOG.challengePuzzle;
  return ACADEMIC_CATALOG.focusGame;
};

// score: today's compositeScore (1-5), or null/undefined if no check-in yet.
// symptoms: flat array of symptom strings logged today (may be empty).
export const buildActivityPlan = (score, symptoms = []) => {
  const band =
    score === null || score === undefined
      ? "steady"
      : score < LOW_SCORE_THRESHOLD
      ? "low"
      : score >= POSITIVE_SCORE_THRESHOLD
      ? "positive"
      : "steady";

  return {
    band,
    cards: [
      pickAesthetic(band, symptoms),
      pickSocial(band, symptoms),
      pickAcademic(band, symptoms),
    ],
  };
};
