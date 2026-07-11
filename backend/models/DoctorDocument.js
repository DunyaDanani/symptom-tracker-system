import mongoose from "mongoose";

// FR-03/FR-04: parents upload a doctor's recommendation (photo or PDF),
// admin reviews and validates it. Dedicated model — this used to be a
// "doctorNote" type mixed into StudyResource, but that had no
// review/approval workflow, so it's been split out.
const doctorDocumentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    fileName: {
      type: String,
      required: true, // original filename shown to users
    },

    filePath: {
      type: String,
      required: true, // multer-stored path, served under /uploads
    },

    fileType: {
      type: String,
      enum: ["photo", "pdf"],
      required: true,
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

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    reviewNote: {
      type: String,
      trim: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const DoctorDocument = mongoose.model("DoctorDocument", doctorDocumentSchema);

export default DoctorDocument;
