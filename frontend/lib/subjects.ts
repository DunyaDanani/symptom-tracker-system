// Fixed subject folders shown for both Modules and Past Papers, matching
// backend/models/StudyResource.js SUBJECTS.
export const SUBJECTS = [
  "English",
  "Mathematics",
  "Science",
  "Computer Studies",
  "Other",
] as const;

export type Subject = (typeof SUBJECTS)[number];
