import mongoose from "mongoose";
import { BRANCHES } from "./Student.js";

// The 3-term academic calendar an admin configures once per year. This is
// the single source of truth for which dates fall in which term — used to:
//   1. Tag every symptom log / emotion check-in / module upload with the
//      Academic Year + Term it belongs to (manually chosen on the adult-
//      facing forms, auto-derived from the calendar for the child's own
//      one-tap emotion check-in).
//   2. Power the "By Term" report range, so a term's report covers exactly
//      that term's real date range instead of a rolling N-day window.
export const TERMS = ["Term 1", "Term 2", "Term 3"];

// National and Cambridge students follow different term dates, and each
// branch can set its own calendar, so every term belongs to one
// (branch, programCategory) pair. Matches Student.programCategory.
export const PROGRAM_CATEGORIES = ["national", "cambridge"];

// Academic years are stored as a plain 4-digit year ("2026"). Enforcing the
// format stops the same year being entered two ways ("2026" vs "2026/27"),
// which the unique (year, term) index can't catch on its own.
export const ACADEMIC_YEAR_REGEX = /^\d{4}$/;

// Term dates are whole calendar days. The admin form sends "YYYY-MM-DD",
// which JS parses as midnight UTC — so an end date of "2026-04-10" used to
// mean 10 Apr 00:00, silently dropping everything logged ON the last day
// of the term from term tagging and term reports. Normalising start to the
// first millisecond and end to the last millisecond of their day makes the
// range inclusive of both days and lets back-to-back terms sit next to each
// other without overlapping.
export const startOfDayUTC = (value) => {
  const d = new Date(value);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

export const endOfDayUTC = (value) => {
  const d = new Date(value);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

const academicTermSchema = new mongoose.Schema(
  {
    // Not schema-required so terms created before calendars were split per
    // branch/curriculum still load. The controller requires both on every
    // create/edit; legacy rows without them act as a school-wide fallback
    // until an admin assigns them (see resolveTermForStudent).
    branch: {
      type: String,
      enum: BRANCHES,
    },

    programCategory: {
      type: String,
      enum: PROGRAM_CATEGORIES,
    },

    academicYear: {
      type: String,
      required: true,
      trim: true,
      match: [ACADEMIC_YEAR_REGEX, "Academic year must be a 4-digit year (e.g. 2026)"],
    },

    term: {
      type: String,
      enum: TERMS,
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Mongoose 9 hooks don't receive `next` — just return.
academicTermSchema.pre("validate", function normaliseTermDates() {
  if (this.startDate) this.startDate = startOfDayUTC(this.startDate);
  if (this.endDate) this.endDate = endOfDayUTC(this.endDate);
});

// One row per (branch, curriculum, year, term) — prevents an admin from
// defining "Wattala · Cambridge · 2026 Term 1" twice with different dates,
// while still letting every branch/curriculum have its own Term 1.
academicTermSchema.index(
  { branch: 1, programCategory: 1, academicYear: 1, term: 1 },
  { unique: true }
);

const AcademicTerm = mongoose.model("AcademicTerm", academicTermSchema);

export default AcademicTerm;
