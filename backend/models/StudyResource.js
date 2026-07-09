import mongoose from "mongoose";

// A single uploaded file. "module" files are grouped by "topic" (teacher
// picks the topic name when uploading, matching the mockup's Topic 1/Topic 2
// sections). "pastPaper" files are a flat list. "doctorNote" is uploaded by
// a parent, not a teacher.
const studyResourceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    type: {
      type: String,
      enum: ["module", "pastPaper", "doctorNote"],
      required: true,
    },

    // Only used when type === "module".
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
