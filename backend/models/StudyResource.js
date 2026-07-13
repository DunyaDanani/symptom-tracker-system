import mongoose from "mongoose";

// The fixed subject folders shown for both Modules and Past Papers.
export const SUBJECTS = [
  "English",
  "Mathematics",
  "Science",
  "Computer Studies",
  "Other",
];

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
