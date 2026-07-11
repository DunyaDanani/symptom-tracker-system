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
        "cao",
        "shadow_teacher",
        "class_teacher",
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

    // Which branch this user belongs to. Meaningful for "principal" (the
    // branch they manage) and, since the 20 Feb 2026 client meeting, also
    // for "class_teacher" (who sees all students in their branch rather
    // than one 1:1 assigned child like a shadow teacher) — left unset for
    // other roles.
    //
    // Note: "subject_teacher" was deliberately left out. There are many
    // subject teachers per branch, each potentially teaching across
    // multiple classes/branches — that's a real many-to-many relationship
    // this simple branch-scoped model can't honestly represent. Modeling
    // that properly would need a dedicated assignment structure (which
    // subjects, which classes, which branches) rather than a single
    // branch field, so it's out of scope for now.
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
      // Optional field (many roles never set it), so only validate format
      // when a value is actually present — an empty/null email should
      // still pass.
      validate: {
        validator: (value) =>
          !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: "Please provide a valid email address",
      },
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