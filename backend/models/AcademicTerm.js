import mongoose from "mongoose";

// The 3-term academic calendar an admin configures once per year. This is
// the single source of truth for which dates fall in which term — used to:
//   1. Tag every symptom log / emotion check-in / module upload with the
//      Academic Year + Term it belongs to (manually chosen on the adult-
//      facing forms, auto-derived from the calendar for the child's own
//      one-tap emotion check-in).
//   2. Power the "By Term" report range, so a term's report covers exactly
//      that term's real date range instead of a rolling N-day window.
export const TERMS = ["Term 1", "Term 2", "Term 3"];

const academicTermSchema = new mongoose.Schema(
  {
    academicYear: {
      type: String,
      required: true,
      trim: true,
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

// One row per (year, term) — prevents an admin from accidentally defining
// "2026 Term 1" twice with different date ranges.
academicTermSchema.index({ academicYear: 1, term: 1 }, { unique: true });

const AcademicTerm = mongoose.model("AcademicTerm", academicTermSchema);

export default AcademicTerm;
