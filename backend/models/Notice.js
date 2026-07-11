import mongoose from "mongoose";

// School-wide announcements. Admin and Principal can post; every
// authenticated role (admin, principal, shadow_teacher, parent, child)
// reads the full feed — notices aren't branch-filtered, they go out to
// everyone, per how the school actually uses them.
const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    body: {
      type: String,
      required: true,
      trim: true,
    },

    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    postedByRole: {
      type: String,
      required: true,
    },

    // Informational only (shown as a tag on principal-authored notices) —
    // not used to filter who can see the notice.
    branch: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Notice = mongoose.model("Notice", noticeSchema);

export default Notice;
