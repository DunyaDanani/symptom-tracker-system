// Simple school-day window used to tag whether a child's emotion
// check-in happened during school (where a shadow teacher can also weigh
// in) or afterwards from home. Deliberately a plain constant rather than
// per-branch config — good enough for tagging/copy purposes today, easy
// to swap out once real school-hour data (per branch/grade) exists.
const SCHOOL_START_HOUR = 8; // 8:00am
const SCHOOL_END_HOUR = 15; // 3:00pm

export const isWithinSchoolHours = (date = new Date()) => {
  const hour = date.getHours();
  return hour >= SCHOOL_START_HOUR && hour < SCHOOL_END_HOUR;
};

export const currentCheckinContext = (date = new Date()) =>
  isWithinSchoolHours(date) ? "school" : "home";
