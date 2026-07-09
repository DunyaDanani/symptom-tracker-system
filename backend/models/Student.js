import mongoose from "mongoose";

// The 7 OKI branch locations. Shared by student registration (which branch
// a student belongs to) and principal accounts (which branch they manage).
export const BRANCHES = [
  "Wattala",
  "Kandana",
  "Kiribathgoda",
  "Kaduwela",
  "Biyagama",
  "Negombo",
  "OKI City School - Negombo",
];

const studentSchema = new mongoose.Schema(
  {
    branch: {
      type: String,
      enum: BRANCHES,
      required: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    dateOfBirth: {
      type: Date,
      required: true,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },

    grade: {
      type: String,
      required: true,
      trim: true,
    },

    section: {
      type: String,
      trim: true,
    },

    diagnosis: {
      type: String,
      required: true,
      trim: true,
    },

    communicationLevel: {
      type: String,
      enum: ["verbal", "non-verbal", "partially-verbal"],
      default: "non-verbal",
    },

    additionalNotes: {
      type: String,
      trim: true,
    },

    // Parent / Guardian details
    parentFirstName: {
      type: String,
      required: true,
      trim: true,
    },

    parentRelationship: {
      type: String,
      trim: true,
    },

    parentEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    parentPhone: {
      type: String,
      required: true,
      trim: true,
    },

    homeCity: {
      type: String,
      trim: true,
    },

    // Login accounts (auto-generated at registration)
    studentUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    parentUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    assignedTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    status: {
      type: String,
      enum: ["unassigned", "assigned"],
      default: "unassigned",
    },

    // Manual "needs attention" flag — set by a shadow teacher or admin,
    // surfaced on the principal's dashboard alongside auto-detected flags.
    flagged: {
      type: Boolean,
      default: false,
    },

    flagNote: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Student = mongoose.model("Student", studentSchema);

export default Student;