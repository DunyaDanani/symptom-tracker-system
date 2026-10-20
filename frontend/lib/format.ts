// Display helpers for values that are stored exactly as typed or as code
// values (e.g. "partially-verbal", "ASd specialist"), so every page shows
// them tidily ("Partially verbal", "ASD Specialist") without changing what's
// stored in the database.

const COMMUNICATION_LABELS: Record<string, string> = {
  "non-verbal": "Non-verbal",
  "partially-verbal": "Partially verbal",
  verbal: "Verbal",
};

/** "partially-verbal" -> "Partially verbal" */
export function formatCommunication(value?: string | null): string {
  if (!value) return "";
  return (
    COMMUNICATION_LABELS[value] ||
    value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, " ")
  );
}

// Abbreviations common in diagnoses and teacher qualifications, written
// the way they're normally spelled.
const SPECIAL_WORDS: Record<string, string> = {
  asd: "ASD",
  adhd: "ADHD",
  add: "ADD",
  ocd: "OCD",
  odd: "ODD",
  sld: "SLD",
  spd: "SPD",
  pdd: "PDD",
  gdd: "GDD",
  dcd: "DCD",
  cp: "CP",
  id: "ID",
  ld: "LD",
  sen: "SEN",
  send: "SEND",
  aba: "ABA",
  ot: "OT",
  cbt: "CBT",
  iq: "IQ",
  ebd: "EBD",
  bsc: "BSc",
  msc: "MSc",
  phd: "PhD",
  ba: "BA",
  ma: "MA",
  hnd: "HND",
  nvq: "NVQ",
};

const SMALL_WORDS = new Set(["a", "an", "and", "in", "of", "for", "with", "the", "to", "on", "or"]);

/**
 * Tidies free text such as a diagnosis, specialization or qualification:
 * "ASd specialist" -> "ASD Specialist", "diploma in special education" ->
 * "Diploma in Special Education". Not for people's names.
 */
export function formatText(value?: string | null): string {
  if (!value) return "";
  return value
    .trim()
    .split(/(\s+|[\/(),-])/)
    .map((part, i) => {
      if (!/^[A-Za-z]+$/.test(part)) return part;
      const lower = part.toLowerCase();
      if (SPECIAL_WORDS[lower]) return SPECIAL_WORDS[lower];
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}
