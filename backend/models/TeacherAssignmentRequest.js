import mongoose from "mongoose";

// A shadow teacher is meant to be 1:1 with a single student (see
// Student.assignedTeacher / Student.status in Student.js). When an admin
// wants to assign a teacher who ALREADY has a student in their care to a
// second, newly-admitted student, that requires the branch principal's
// sign-off first — this model is the persisted record of that request and
// the principal's decision on it.
//
// `branch` is whichever branch the teacher is CURRENTLY assigned in
// (derived at request-creation time from their existing student) — that's
// the principal who currently oversees this teacher's placement, so
// they're the one who has to approve sharing them with another student,
// even if the new student being admitted is in a different branch.
//
// Lifecycle: pending -> approved -> fulfilled (once the admin actually
// completes the new student's registration using this approval), or
// pending -> denied. A request is single-use: fulfilling it doesn't grant
// standing permission for further students, the admin has to request again.
export const TEACHER_REQUEST_STATUSES = [
  "pending",
  "approved",
  "denied",
  "fulfilled",
];

const teacherAssignmentRequestSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    branch: {
      type: String,
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: TEACHER_REQUEST_STATUSES,
      default: "pending",
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
    denialReason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

const TeacherAssignmentRequest = mongoose.model(
  "TeacherAssignmentRequest",
  teacherAssignmentRequestSchema
);

export default TeacherAssignmentRequest;
