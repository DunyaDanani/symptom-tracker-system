import mongoose from "mongoose";

// A request to place an existing shadow teacher (one already in the system
// — currently with a student, or kept on file after an earlier student was
// moved away from them) with a new child.
//
// Flow:
//   1. Admin asks the principal of the branch the new child is joining
//      (status "pending").
//   2. The principal either denies it ("denied"), or forwards it to the
//      teacher with a message ("forwarded") — the message also lands in
//      the teacher's Messages inbox.
//   3. The teacher accepts ("accepted") or declines ("declined").
//   4. The admin assigns the teacher to the child, which spends the request
//      ("fulfilled"). An accepted request is single-use.
//   The admin can cancel at any point before it's fulfilled ("cancelled").
//
// "approved" is the old principal-only approval (before teachers had to
// accept). Existing rows with it are treated like "forwarded": the teacher
// still has to accept before the admin can assign them.
export const TEACHER_REQUEST_STATUSES = [
  "pending",
  "forwarded",
  "approved",
  "accepted",
  "denied",
  "declined",
  "cancelled",
  "fulfilled",
];

// Statuses where the request is still in progress. Only one in-progress
// request may exist per teacher at a time (see the partial unique index
// below) so two admins can't both be negotiating the same teacher for two
// different children.
export const OPEN_REQUEST_STATUSES = ["pending", "forwarded", "approved", "accepted"];

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
    // The branch the new child is joining — that branch's principal is the
    // one asked. The teacher can only be assigned to a child in this branch
    // using this request.
    branch: {
      type: String,
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },

    // The child the teacher is being asked to take on. A snapshot, because
    // during admission the student record doesn't exist yet — `student` is
    // only set when requesting for an already-admitted child (and once the
    // request is fulfilled). Shown to the principal and the teacher so
    // they know who the child is and what support they need.
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
    studentName: { type: String, trim: true, default: "" },
    studentGrade: { type: String, trim: true, default: "" },
    studentProgramCategory: { type: String, trim: true, default: "" },
    studentDiagnosis: { type: String, trim: true, default: "" },
    studentCommunicationLevel: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: TEACHER_REQUEST_STATUSES,
      default: "pending",
    },
    // Kept in sync with `status` by the pre-save hook; backs the
    // one-open-request-per-teacher index.
    isOpen: {
      type: Boolean,
      default: true,
    },

    // Principal's decision
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
    // What the principal wrote to the teacher when forwarding.
    principalMessage: {
      type: String,
      trim: true,
      default: "",
    },

    // Teacher's decision
    teacherRespondedAt: {
      type: Date,
      default: null,
    },
    declineReason: {
      type: String,
      trim: true,
      default: "",
    },

    // Admin cancellation
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },

    // The child this request was finally used for.
    fulfilledStudent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
  },
  { timestamps: true }
);

// Mongoose 9 hooks don't receive `next` — just return.
teacherAssignmentRequestSchema.pre("save", function syncIsOpen() {
  this.isOpen = OPEN_REQUEST_STATUSES.includes(this.status);
});

teacherAssignmentRequestSchema.index(
  { teacher: 1 },
  { unique: true, partialFilterExpression: { isOpen: true } }
);

const TeacherAssignmentRequest = mongoose.model(
  "TeacherAssignmentRequest",
  teacherAssignmentRequestSchema
);

export default TeacherAssignmentRequest;
