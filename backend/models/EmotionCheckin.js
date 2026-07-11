import mongoose from "mongoose";

// Emoji scale used by both child and teacher, mapped to a numeric score
// so we can compute a combined average automatically.
const EMOJI_SCORES = {
  "very_sad": 1,
  "sad": 2,
  "neutral": 3,
  "happy": 4,
  "very_happy": 5,
};

const emotionCheckinSchema = new mongoose.Schema(
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

    // Child's own emoji tap (self-report). Optional — the child and teacher
    // submit independently, so either one may arrive first for the day.
    childEmoji: {
      type: String,
      enum: Object.keys(EMOJI_SCORES),
    },

    // Teacher's independently observed emoji. Also optional for the same
    // reason.
    teacherEmoji: {
      type: String,
      enum: Object.keys(EMOJI_SCORES),
    },

    // Auto-calculated composite score (average of both, 1-5)
    compositeScore: {
      type: Number,
    },

    sessionDate: {
      type: Date,
      default: Date.now,
    },

    // Was the child's self check-in submitted during the school day or
    // afterwards (e.g. from home in the evening)? Set automatically from
    // the server clock at submission time — not shown to the child, but
    // carried through to the activity-plan response so the "even after
    // school hours" suggestion flow can eventually feed this into the AI
    // step. Purely informational for now (no gating on it anywhere).
    context: {
      type: String,
      enum: ["school", "home"],
      default: "school",
    },
  },
  {
    timestamps: true,
  }
);

// Automatically compute the composite score before saving. If only one
// side (child or teacher) has checked in so far, the score is just that
// one value — it's recalculated as an average once both are present.
emotionCheckinSchema.pre("save", function (next) {
  const childScore = this.childEmoji ? EMOJI_SCORES[this.childEmoji] : null;
  const teacherScore = this.teacherEmoji
    ? EMOJI_SCORES[this.teacherEmoji]
    : null;

  if (childScore !== null && teacherScore !== null) {
    this.compositeScore = Number(((childScore + teacherScore) / 2).toFixed(1));
  } else if (childScore !== null) {
    this.compositeScore = childScore;
  } else if (teacherScore !== null) {
    this.compositeScore = teacherScore;
  }
  next();
});

const EmotionCheckin = mongoose.model("EmotionCheckin", emotionCheckinSchema);

export default EmotionCheckin;
export { EMOJI_SCORES };