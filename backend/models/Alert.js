import mongoose from "mongoose";

// FR-10: System sends push notifications to admin when alert thresholds
// are reached. An Alert is the persisted record behind that notification —
// created automatically by the alert engine (see utils/alertEngine.js) and
// cleared once an admin acknowledges it.
export const ALERT_TYPES = {
  SYMPTOM_FREQUENCY: "symptom_frequency",
  LOW_EMOTION_SCORE: "low_emotion_score",
  MANUAL_FLAG: "manual_flag",
};

const alertSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    type: {
      type: String,
      enum: Object.values(ALERT_TYPES),
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    // Unacknowledged alerts are what powers the admin notification badge.
    // Left true once an admin has reviewed it.
    acknowledged: {
      type: Boolean,
      default: false,
    },

    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    acknowledgedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Alert = mongoose.model("Alert", alertSchema);

export default Alert;
