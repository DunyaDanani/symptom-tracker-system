import mongoose from "mongoose";
import { TERMS } from "./AcademicTerm.js";

// The fixed subject folders shown for both Modules and Past Papers.
export const SUBJECTS = [
  "English",
  "Mathematics",
  "Science",
  "Computer Studies",
  "Other",
];

// Re-exported so existing imports of TERMS from this file keep working —
// the real source of truth is now AcademicTerm.js.
export { TERMS };

// A single uploaded file. "module" files are grouped by "subject" folder
// then by "topic" within it (teacher picks the topic name when uploading,
// matching the mockup's Topic 1/Topic 2 sections). "pastPaper" files are
// grouped by "subject" folder only (flat list within each folder).
// "submission" files are the child/parent's completed work handed back to
// the teacher — grouped by "subject" then "topic" the same way modules are,
// since a submission always answers a specific topic the teacher assigned.
//
// Doctor's recommendation documents used to live here as a third type but
// now have their own dedicated model (see DoctorDocument.js) with proper
// review/approval status.
const studyResourceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    type: {
      type: String,
      enum: ["module", "pastPaper", "submission"],
      required: true,
    },

    // Subject folder — required for both module and pastPaper uploads.
    subject: {
      type: String,
      enum: SUBJECTS,
      required: true,
    },

    // Used when type === "module" or "submission" — which topic within the
    // subject this file belongs to / answers.
    topic: {
      type: String,
      trim: true,
    },

    // Which academic year/term a module file was assigned for — required
    // for "module" uploads (see uploadResource), optional/unset for
    // pastPaper and submission so older records and non-module uploads
    // aren't affected.
    academicYear: {
      type: String,
      trim: true,
    },

    term: {
      type: String,
      enum: ["", ...TERMS],
      default: "",
    },

    fileName: {
      type: String,
      required: true, // original filename shown to users, e.g. "homework.pdf"
    },

    filePath: {
      type: String,
      required: true, // multer-stored path, served under /uploads
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    uploadedByRole: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const StudyResource = mongoose.model("StudyResource", studyResourceSchema);

export default StudyResource;
