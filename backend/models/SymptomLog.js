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

    // Client meeting 20 Feb 2026: medication details must be recorded
    // within the symptom tracker module alongside the symptom checkboxes.
    medications: {
      type: [
        {
          name: { type: String, trim: true, required: true },
          dosage: { type: String, trim: true },
          time: { type: String, trim: true }, // free text, e.g. "After lunch"
        },
      ],
      default: [],
    },

    medicationNotes: {
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