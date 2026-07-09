import bcrypt from "bcrypt";
import User from "../models/User.js";
import { BRANCHES } from "../models/Student.js";
import { generateUsername, generateTempPassword } from "../utils/credentialUtils.js";

// @route   POST /api/staff/principals
// @access  Admin only
// Creates a principal login account scoped to one branch.
// Body: { name, branch }
export const createPrincipal = async (req, res) => {
  const { name, branch } = req.body;

  try {
    if (!name || !branch) {
      return res.status(400).json({
        success: false,
        message: "Name and branch are required",
      });
    }

    if (!BRANCHES.includes(branch)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch",
      });
    }

    const [firstName, ...rest] = name.trim().split(" ");
    const lastName = rest.join(" ") || firstName;

    const username = await generateUsername(firstName, lastName, User);
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const principal = new User({
      username,
      password: hashedPassword,
      role: "principal",
      name,
      branch,
    });
    await principal.save();

    res.status(201).json({
      success: true,
      message: "Principal account created",
      credentials: { username, password: tempPassword },
      principal: {
        _id: principal._id,
        name: principal.name,
        branch: principal.branch,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/staff/principals
// @access  Admin only
// Lists all principal accounts (for the admin to see who's assigned where).
export const getPrincipals = async (req, res) => {
  try {
    const principals = await User.find({ role: "principal" }).select(
      "name username branch createdAt"
    );

    res.json({
      success: true,
      principals,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
