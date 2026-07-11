import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Message from "../models/Message.js";
import { sendEmail, notifyAdmin } from "../utils/mailer.js";

// Resolves where a recovery email should actually go for a given user.
// Staff (admin/principal/shadow_teacher) use their own User.email.
// Parent and child accounts have no email of their own — both route
// through the linked Student's parentEmail.
const resolveRecoveryEmail = async (user) => {
  if (user.role === "child") {
    const student = await Student.findOne({ studentUser: user._id });
    if (!student) return null;
    return {
      email: student.parentEmail,
      label: `${student.firstName} ${student.lastName} (via parent)`,
    };
  }
  if (user.role === "parent") {
    const student = await Student.findOne({ parentUser: user._id });
    if (!student) return null;
    return { email: student.parentEmail, label: user.name };
  }
  if (!user.email) return null;
  return { email: user.email, label: user.name };
};

// Every forgot-username / forgot-password / reset-password event both
// messages every admin account (shows up in their existing Messages
// inbox + notification bell) and emails ADMIN_EMAIL if configured.
const notifyAdminOfRecoveryEvent = async ({ requestingUser, message }) => {
  try {
    const admins = await User.find({ role: { $in: ["admin", "cao"] } });
    await Promise.all(
      admins.map((admin) =>
        Message.create({
          sender: requestingUser._id,
          senderRole: requestingUser.role,
          recipient: admin._id,
          recipientRole: admin.role,
          category: "Account Recovery",
          body: message,
        })
      )
    );
    await notifyAdmin({ subject: `[OKI System] ${message}`, html: `<p>${message}</p>` });
  } catch (error) {
    // Don't let a notification failure block the actual recovery flow.
    console.error("Failed to notify admin of recovery event", error);
  }
};

export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Wrong password",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        branch: user.branch, // only set for principal accounts
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.json({
      success: true,
      token,
      role: user.role,
      name: user.name,
      branch: user.branch,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   POST /api/auth/view-as-child
// @access  Parent only
// Lets a parent, from inside their own authenticated session, switch into
// their child's dashboard without the child needing to know or enter any
// credentials of their own. Issues a fresh token for the linked child
// account. The child's own independent login (and its parent-mediated
// forgot-username/forgot-password flow) is unaffected — this is purely an
// additive convenience for parents.
export const viewAsChild = async (req, res) => {
  try {
    const student = await Student.findOne({ parentUser: req.user.id }).populate(
      "studentUser"
    );

    if (!student || !student.studentUser) {
      return res.status(404).json({
        success: false,
        message: "No child account is linked to your profile yet.",
      });
    }

    const childUser = student.studentUser;

    const token = jwt.sign(
      { id: childUser._id, role: childUser.role, branch: childUser.branch },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      token,
      role: childUser.role,
      name: childUser.name,
      branch: childUser.branch,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   GET /api/auth/me
// @access  Any authenticated user
// Returns the logged-in user's own account details — powers the header
// user menu and the per-role account/profile pages.
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "name username role branch email createdAt"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/auth/pin-status
// @access  Any authenticated user
export const getPinStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("pin");
    res.json({
      success: true,
      hasPin: !!user?.pin,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   POST /api/auth/set-pin
// @access  Any authenticated user
// Body: { pin: "1234" } — creates or overwrites the user's 4-digit PIN.
export const setPin = async (req, res) => {
  const { pin } = req.body;

  try {
    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: "PIN must be exactly 4 digits",
      });
    }

    const hashedPin = await bcrypt.hash(pin, 10);
    await User.findByIdAndUpdate(req.user.id, { pin: hashedPin });

    res.json({
      success: true,
      message: "PIN saved",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   POST /api/auth/forgot-username
// @access  Public
// Body: { email }
// Staff (admin/principal/shadow_teacher) are looked up by their own
// User.email. Parents and children have no email of their own, so this
// also checks Student.parentEmail and — if it matches — emails back both
// the parent's username and the child's username together.
export const forgotUsername = async (req, res) => {
  const { email } = req.body;
  const generic = {
    success: true,
    message: "If that email is linked to an account, we've sent the username(s) to it.",
  };

  try {
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const staffUser = await User.findOne({ email: normalizedEmail });
    const student = await Student.findOne({ parentEmail: normalizedEmail })
      .populate("studentUser")
      .populate("parentUser");

    if (!staffUser && !student) return res.json(generic);

    const lines = [];
    if (staffUser) lines.push(`Your username: <strong>${staffUser.username}</strong>`);
    if (student?.parentUser) {
      lines.push(
        `Parent username (for ${student.firstName} ${student.lastName}): <strong>${student.parentUser.username}</strong>`
      );
    }
    if (student?.studentUser) {
      lines.push(
        `${student.firstName}'s student username: <strong>${student.studentUser.username}</strong>`
      );
    }

    await sendEmail({
      to: email,
      subject: "Your OKI International School username(s)",
      html: lines.map((l) => `<p>${l}</p>`).join(""),
    });

    const requestingUser = staffUser || student.parentUser;
    if (requestingUser) {
      await notifyAdminOfRecoveryEvent({
        requestingUser,
        message: `${requestingUser.role} "${requestingUser.username}" requested a username reminder.`,
      });
    }

    res.json(generic);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/auth/forgot-password
// @access  Public
// Body: { username }
// Generates a 6-digit reset code, hashes + stores it with a 15-minute
// expiry, and emails it to the account's recovery address (see
// resolveRecoveryEmail above).
export const forgotPassword = async (req, res) => {
  const { username } = req.body;
  const generic = {
    success: true,
    message: "If that account exists, a reset code has been sent.",
  };

  try {
    if (!username) {
      return res.status(400).json({ success: false, message: "Username is required" });
    }

    const user = await User.findOne({ username });
    if (!user) return res.json(generic);

    const recovery = await resolveRecoveryEmail(user);
    if (!recovery || !recovery.email) {
      return res.status(400).json({
        success: false,
        message: "No recovery email is linked to this account. Contact the school admin.",
      });
    }

    const code = String(crypto.randomInt(100000, 999999));
    user.resetCode = await bcrypt.hash(code, 10);
    user.resetCodeExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    await sendEmail({
      to: recovery.email,
      subject: "OKI International School — Password Reset Code",
      html: `<p>Reset code for ${recovery.label}: <strong>${code}</strong></p><p>This code expires in 15 minutes.</p>`,
    });

    await notifyAdminOfRecoveryEvent({
      requestingUser: user,
      message: `${user.role} "${user.username}" requested a password reset.`,
    });

    res.json(generic);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/auth/reset-password
// @access  Public
// Body: { username, code, newPassword }
export const resetPassword = async (req, res) => {
  const { username, code, newPassword } = req.body;

  try {
    if (!username || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Username, code and new password are required",
      });
    }

    const user = await User.findOne({ username });
    if (
      !user ||
      !user.resetCode ||
      !user.resetCodeExpires ||
      user.resetCodeExpires < new Date()
    ) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset code" });
    }

    const matches = await bcrypt.compare(code, user.resetCode);
    if (!matches) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset code" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();

    await notifyAdminOfRecoveryEvent({
      requestingUser: user,
      message: `${user.role} "${user.username}" successfully reset their password.`,
    });

    res.json({ success: true, message: "Password updated. You can now sign in." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/auth/change-password
// @access  Any authenticated user (admin included) — changes your own
// password from inside the dashboard, as opposed to the logged-out
// forgot-password flow above.
// Body: { currentPassword, newPassword }
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    const user = await User.findById(req.user.id);
    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await notifyAdminOfRecoveryEvent({
      requestingUser: user,
      message: `${user.role} "${user.username}" changed their password from their dashboard.`,
    });

    res.json({ success: true, message: "Password updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/auth/change-username
// @access  Any authenticated user — lets a student/parent/teacher (or
// anyone) swap their auto-generated username for one they'll actually
// remember, once they're logged in.
// Body: { newUsername }
export const changeUsername = async (req, res) => {
  const { newUsername } = req.body;

  try {
    const trimmed = (newUsername || "").trim();
    if (!trimmed) {
      return res.status(400).json({ success: false, message: "New username is required" });
    }

    const existing = await User.findOne({ username: trimmed });
    if (existing && existing._id.toString() !== req.user.id) {
      return res.status(400).json({ success: false, message: "That username is already taken" });
    }

    const user = await User.findById(req.user.id);
    const oldUsername = user.username;
    user.username = trimmed;
    await user.save();

    await notifyAdminOfRecoveryEvent({
      requestingUser: user,
      message: `${user.role} "${oldUsername}" changed their username to "${trimmed}".`,
    });

    res.json({ success: true, message: "Username updated", username: user.username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/auth/change-email
// @access  Staff only (admin, principal, shadow_teacher, class_teacher) —
// parent/child accounts have no email of their own; they recover through
// Student.parentEmail instead (see resolveRecoveryEmail above), so
// changing it here wouldn't do anything for them.
// Body: { email }
export const changeEmail = async (req, res) => {
  const { email } = req.body;

  const STAFF_ROLES = ["admin", "cao", "principal", "shadow_teacher", "class_teacher"];
  if (!STAFF_ROLES.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "This account type doesn't use a recovery email",
    });
  }

  try {
    const trimmed = (email || "").trim().toLowerCase();
    if (!trimmed) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    const existing = await User.findOne({ email: trimmed });
    if (existing && existing._id.toString() !== req.user.id) {
      return res.status(400).json({
        success: false,
        message: "That email is already linked to another account",
      });
    }

    const user = await User.findById(req.user.id);
    const hadEmailBefore = Boolean(user.email);
    user.email = trimmed;
    await user.save();

    await notifyAdminOfRecoveryEvent({
      requestingUser: user,
      message: `${user.role} "${user.username}" ${
        hadEmailBefore ? "updated" : "added"
      } their recovery email.`,
    });

    res.json({ success: true, message: "Recovery email saved", email: user.email });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/auth/verify-pin
// @access  Any authenticated user
// Body: { pin: "1234" }
export const verifyPin = async (req, res) => {
  const { pin } = req.body;

  try {
    if (!pin) {
      return res.status(400).json({
        success: false,
        message: "PIN is required",
      });
    }

    const user = await User.findById(req.user.id).select("pin");

    if (!user?.pin) {
      return res.status(400).json({
        success: false,
        message: "No PIN has been set yet",
      });
    }

    const match = await bcrypt.compare(pin, user.pin);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Incorrect PIN",
      });
    }

    res.json({
      success: true,
      message: "PIN verified",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
