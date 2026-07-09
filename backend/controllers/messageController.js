import Student from "../models/Student.js";
import User from "../models/User.js";
import Message, { MESSAGE_CATEGORIES } from "../models/Message.js";

// @route   GET /api/messages/categories
// @access  Any authenticated user
export const getCategories = (req, res) => {
  res.json({
    success: true,
    categories: MESSAGE_CATEGORIES,
  });
};

// @route   GET /api/messages/recipients
// @access  Child, Parent
// Returns who a child/parent is allowed to message: the student's assigned
// shadow teacher, the branch principal, and any admin.
export const getRecipients = async (req, res) => {
  const { role, id } = req.user;

  try {
    let student = null;

    if (role === "child") {
      student = await Student.findOne({ studentUser: id }).populate(
        "assignedTeacher",
        "name"
      );
    } else if (role === "parent") {
      student = await Student.findOne({ parentUser: id }).populate(
        "assignedTeacher",
        "name"
      );
    } else {
      return res.status(403).json({
        success: false,
        message: "This role does not have a recipient list",
      });
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "No linked student profile found",
      });
    }

    const recipients = [];

    if (student.assignedTeacher) {
      recipients.push({
        id: student.assignedTeacher._id,
        name: student.assignedTeacher.name,
        roleLabel: "Shadow Teacher",
      });
    }

    const principal = await User.findOne({
      role: "principal",
      branch: student.branch,
    }).select("name");
    if (principal) {
      recipients.push({
        id: principal._id,
        name: principal.name,
        roleLabel: "Branch Principal",
      });
    }

    const admins = await User.find({ role: "admin" }).select("name");
    admins.forEach((admin) => {
      recipients.push({
        id: admin._id,
        name: admin.name,
        roleLabel: "Admin",
      });
    });

    res.json({
      success: true,
      recipients,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   POST /api/messages
// @access  Any authenticated user
// Body (multipart/form-data): recipientId, category, body, attachment? (file)
export const sendMessage = async (req, res) => {
  const { recipientId, category, body } = req.body;

  try {
    if (!recipientId || !category || !body) {
      return res.status(400).json({
        success: false,
        message: "Recipient, category, and message body are required",
      });
    }

    if (!MESSAGE_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid message category",
      });
    }

    const recipient = await User.findById(recipientId).select("role");
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: "Recipient not found",
      });
    }

    const message = await Message.create({
      sender: req.user.id,
      senderRole: req.user.role,
      recipient: recipient._id,
      recipientRole: recipient.role,
      category,
      body,
      attachmentPath: req.file ? req.file.path : null,
      attachmentName: req.file ? req.file.originalname : null,
    });

    res.status(201).json({
      success: true,
      message: "Message sent",
      data: message,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/messages/inbox
// @access  Any authenticated user
// Viewing the inbox marks everything in it as read, which clears the
// notification bell badge.
export const getInbox = async (req, res) => {
  try {
    const messages = await Message.find({ recipient: req.user.id })
      .populate("sender", "name role")
      .sort({ createdAt: -1 });

    await Message.updateMany(
      { recipient: req.user.id, read: false },
      { read: true }
    );

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/messages/sent
// @access  Any authenticated user
// Sent history — lets child/parent see what they've asked, and lets
// teacher/principal/admin see the replies they've sent back.
export const getSentMessages = async (req, res) => {
  try {
    const messages = await Message.find({ sender: req.user.id })
      .populate("recipient", "name role")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/messages/unread-count
// @access  Any authenticated user
// Powers the notification bell badge in every dashboard header.
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user.id,
      read: false,
    });

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
