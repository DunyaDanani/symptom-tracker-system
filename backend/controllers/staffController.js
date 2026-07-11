import bcrypt from "bcrypt";
import User from "../models/User.js";
import Student, { BRANCHES } from "../models/Student.js";
import { generateUsername, generateTempPassword } from "../utils/credentialUtils.js";
import Alert from "../models/Alert.js";
import Message from "../models/Message.js";
import DoctorDocument from "../models/DoctorDocument.js";
import { sendEmail } from "../utils/mailer.js";
import { isValidEmail } from "../utils/validators.js";

// @route   GET /api/staff/stats
// @access  Admin only
// Powers the four stat tiles on the admin dashboard: total students
// (school-wide, across every branch), total shadow teacher accounts,
// unread messages sent in by parents, and doctor-recommendation
// documents still awaiting review.
export const getAdminStats = async (req, res) => {
  try {
    const [totalStudents, shadowTeacherCount, unreadParentMessages, pendingDocReviews] =
      await Promise.all([
        Student.countDocuments({}),
        User.countDocuments({ role: "shadow_teacher" }),
        Message.countDocuments({
          recipient: req.user.id,
          senderRole: "parent",
          read: false,
        }),
        DoctorDocument.countDocuments({ status: "pending" }),
      ]);

    res.json({
      success: true,
      stats: {
        totalStudents,
        shadowTeacherCount,
        unreadParentMessages,
        pendingDocReviews,
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

// @route   POST /api/staff/principals
// @access  Admin only
// Creates a principal login account scoped to one branch. Email is
// optional at creation time — without one, forgot-password won't work
// for this account until they (or the admin) add one later.
// Body: { name, branch, email? }
export const createPrincipal = async (req, res) => {
  const { name, branch, email } = req.body;

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

    const trimmedEmail = email ? email.trim().toLowerCase() : "";
    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }
    if (trimmedEmail) {
      const existingEmail = await User.findOne({ email: trimmedEmail });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "That email is already linked to another account",
        });
      }
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
      email: trimmedEmail || null,
    });
    await principal.save();

    let emailSent = false;
    if (trimmedEmail) {
      try {
        await sendEmail({
          to: trimmedEmail,
          subject: "Your OKI International School principal account",
          html: `
            <p>Hello ${name},</p>
            <p>A Branch Principal account for ${branch} has been created for you. Here are your login credentials:</p>
            <p>
              Username: ${username}<br/>
              Password: ${tempPassword}
            </p>
            <p>Please log in and change your password when convenient.</p>
          `,
        });
        emailSent = true;
      } catch (emailError) {
        console.error("Failed to email principal credentials:", emailError);
      }
    }

    res.status(201).json({
      success: true,
      message: "Principal account created",
      credentials: { username, password: tempPassword },
      emailSent,
      principal: {
        _id: principal._id,
        name: principal.name,
        branch: principal.branch,
        email: principal.email,
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
      "name username branch email createdAt"
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

// @route   PATCH /api/staff/principals/:id
// @access  Admin only
// Lets admin edit an existing principal's name, branch, or recovery
// email after the account's been created.
// Body: { name?, branch?, email? }
export const updatePrincipal = async (req, res) => {
  const { id } = req.params;
  const { name, branch, email } = req.body;

  try {
    const principal = await User.findOne({ _id: id, role: "principal" });
    if (!principal) {
      return res.status(404).json({
        success: false,
        message: "Principal not found",
      });
    }

    if (branch && !BRANCHES.includes(branch)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch",
      });
    }

    if (typeof email === "string") {
      const trimmedEmail = email.trim().toLowerCase();
      if (trimmedEmail) {
        if (!isValidEmail(trimmedEmail)) {
          return res.status(400).json({
            success: false,
            message: "Please provide a valid email address",
          });
        }
        const existingEmail = await User.findOne({
          email: trimmedEmail,
          _id: { $ne: id },
        });
        if (existingEmail) {
          return res.status(400).json({
            success: false,
            message: "That email is already linked to another account",
          });
        }
      }
      principal.email = trimmedEmail || null;
    }

    if (name && name.trim()) principal.name = name.trim();
    if (branch) principal.branch = branch;

    await principal.save();

    res.json({
      success: true,
      message: "Principal updated",
      principal: {
        _id: principal._id,
        name: principal.name,
        username: principal.username,
        branch: principal.branch,
        email: principal.email,
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

// @route   GET /api/staff/alerts?status=open|all&branch=<branch>
// @access  Admin only
// FR-10: powers the admin notification bell / alerts page. Defaults to
// only unacknowledged ("open") alerts; pass ?status=all for full history.
// Optional ?branch= narrows to alerts raised for students in that one
// branch — admin oversees all 7 branches, so this keeps the list usable.
export const getAlerts = async (req, res) => {
  const status = req.query.status === "all" ? "all" : "open";
  const { branch } = req.query;

  try {
    const filter = status === "open" ? { acknowledged: false } : {};

    if (branch) {
      if (!BRANCHES.includes(branch)) {
        return res.status(400).json({
          success: false,
          message: "Invalid branch",
        });
      }
      const branchStudentIds = await Student.find({ branch }).distinct("_id");
      filter.student = { $in: branchStudentIds };
    }

    const alerts = await Alert.find(filter)
      .populate("student", "firstName lastName grade section branch")
      .populate("acknowledgedBy", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      alerts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/staff/alerts/unread-count
// @access  Admin only
// Powers the alert badge count in the admin dashboard header.
export const getAlertUnreadCount = async (req, res) => {
  try {
    const count = await Alert.countDocuments({ acknowledged: false });

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   PATCH /api/staff/alerts/:id/acknowledge
// @access  Admin only
export const acknowledgeAlert = async (req, res) => {
  const { id } = req.params;

  try {
    const alert = await Alert.findByIdAndUpdate(
      id,
      {
        acknowledged: true,
        acknowledgedBy: req.user.id,
        acknowledgedAt: new Date(),
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    res.json({
      success: true,
      message: "Alert acknowledged",
      alert,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
