import mongoose from "mongoose";

export const SYMPTOM_OPTIONS = [
  "Difficulty paying attention",
  "Difficulty following instructions",
  "Difficulty completing tasks",
  "Communication difficulties",
  "Social interaction difficulties",
  "Motor coordination or movement difficulties",
  "Learning or academic difficulties",
  "Emotional or behavioral regulation difficulties (e.g., frustration, impulsivity, emotional outbursts)",
];

const symptomLogSchema = new mongoose.Schema(
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

    // Which symptoms were checked, from the fixed SYMPTOM_OPTIONS list
    symptoms: {
      type: [String],
      default: [],
    },

    additionalNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // createdAt doubles as the Date/Time shown in Symptom History
  }
);

const SymptomLog = mongoose.model("SymptomLog", symptomLogSchema);

export default SymptomLog;