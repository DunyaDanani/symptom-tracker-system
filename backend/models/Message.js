import mongoose from "mongoose";

export const MESSAGE_CATEGORIES = [
  "Daily Progress",
  "Symptom Update",
  "Behaviour Concern",
  "Academic Concern",
  "Attendance",
  "Therapy Update",
  "Medication Update",
  "General Inquiry",
  "Meeting Request",
  "Emergency",
];

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    senderRole: {
      type: String,
      required: true,
    },

    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    recipientRole: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      enum: MESSAGE_CATEGORIES,
      required: true,
    },

    body: {
      type: String,
      required: true,
      trim: true,
    },

    attachmentPath: {
      type: String,
      default: null,
    },

    attachmentName: {
      type: String,
      default: null,
    },

    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
