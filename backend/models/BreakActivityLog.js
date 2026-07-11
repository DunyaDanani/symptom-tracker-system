import mongoose from "mongoose";

// Client meeting 20 Feb 2026: break-time activities within the 6-hour
// school day must be logged so parents are informed of what their child
// did outside of formal lessons — separate from the curriculum-focused
// Study Module and from the system-suggested activity plan.
export const BREAK_ACTIVITY_OPTIONS = [
  "Outdoor play",
  "Snack time",
  "Free drawing",
  "Sensory play",
  "Rest / quiet time",
  "Group games",
  "Music time",
  "Reading corner",
];

const breakActivityLogSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Which break activities were logged, from the fixed
    // BREAK_ACTIVITY_OPTIONS list — same checkbox pattern as SymptomLog.
    activities: {
      type: [String],
      default: [],
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const BreakActivityLog = mongoose.model(
  "BreakActivityLog",
  breakActivityLogSchema
);

export default BreakActivityLog;
