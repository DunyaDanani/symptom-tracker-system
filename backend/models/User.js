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
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;