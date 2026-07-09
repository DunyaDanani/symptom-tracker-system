import mongoose from "mongoose";
import { BRANCHES } from "./Student.js";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: [
        "admin",
        "shadow_teacher",
        "parent",
        "principal",
        "child",
      ],
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Which branch this user manages. Only meaningful for role "principal"
    // — left unset for other roles.
    branch: {
      type: String,
      enum: BRANCHES,
    },

    // Hashed 4-digit PIN — an extra confirmation step before a parent can
    // view their child's emotion/symptom history. Unset until first use.
    pin: {
      type: String,
      default: null,
    },

    // Recovery email for staff accounts (admin, principal, shadow_teacher).
    // Parent/child accounts don't use this — their recovery routes through
    // Student.parentEmail instead, since a child has no email of their own.
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    // Forgot-password flow: a hashed 6-digit code + its expiry, cleared
    // again once used.
    resetCode: {
      type: String,
      default: null,
    },
    resetCodeExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;