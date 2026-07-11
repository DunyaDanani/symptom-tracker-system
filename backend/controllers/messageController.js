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
// @access  Any authenticated user
// Returns who the current user is allowed to start a new conversation
// with. Child/Parent could already do this (student's assigned shadow
// teacher, the branch principal, any admin). Staff roles (teacher,
// principal, admin) previously had no recipient list at all — they could
// only reply to a message someone else started, never open one — so a
// teacher noticing something concerning had no way to message a parent
// first. This adds a role-appropriate recipient list for all three.
export const getRecipients = async (req, res) => {
  const { role, id } = req.user;

  try {
    if (role === "child" || role === "parent") {
      const student =
        role === "child"
          ? await Student.findOne({ studentUser: id }).populate(
              "assignedTeacher",
              "name"
            )
          : await Student.findOne({ parentUser: id }).populate(
              "assignedTeacher",
              "name"
            );

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

      return res.json({ success: true, recipients });
    }

    if (role === "shadow_teacher") {
      // A teacher's recipient list: the parent of each assigned student,
      // the principal(s) of the branch(es) those students are in (a
      // teacher can be assigned students across more than one branch),
      // and every admin.
      const students = await Student.find({ assignedTeacher: id })
        .populate("parentUser", "name")
        .select("branch parentUser");

      const recipients = [];
      const seenParents = new Set();
      const branches = new Set();

      students.forEach((s) => {
        if (s.parentUser && !seenParents.has(s.parentUser._id.toString())) {
          seenParents.add(s.parentUser._id.toString());
          recipients.push({
            id: s.parentUser._id,
            name: s.parentUser.name,
            roleLabel: "Parent",
          });
        }
        if (s.branch) branches.add(s.branch);
      });

      if (branches.size > 0) {
        const principals = await User.find({
          role: "principal",
          branch: { $in: Array.from(branches) },
        }).select("name branch");
        principals.forEach((p) => {
          recipients.push({
            id: p._id,
            name: p.name,
            roleLabel: `Principal (${p.branch})`,
          });
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

      return res.json({ success: true, recipients });
    }

    if (role === "principal") {
      // A principal's recipient list is scoped to their own branch: every
      // shadow teacher assigned to a student there, every parent of a
      // student there, and every admin.
      const branch = req.user.branch;
      const students = await Student.find({ branch })
        .populate("assignedTeacher", "name")
        .populate("parentUser", "name")
        .select("assignedTeacher parentUser");

      const recipients = [];
      const seen = new Set();

      students.forEach((s) => {
        if (s.assignedTeacher && !seen.has(s.assignedTeacher._id.toString())) {
          seen.add(s.assignedTeacher._id.toString());
          recipients.push({
            id: s.assignedTeacher._id,
            name: s.assignedTeacher.name,
            roleLabel: "Shadow Teacher",
          });
        }
        if (s.parentUser && !seen.has(s.parentUser._id.toString())) {
          seen.add(s.parentUser._id.toString());
          recipients.push({
            id: s.parentUser._id,
            name: s.parentUser.name,
            roleLabel: "Parent",
          });
        }
      });

      const admins = await User.find({ role: "admin" }).select("name");
      admins.forEach((admin) => {
        recipients.push({
          id: admin._id,
          name: admin.name,
          roleLabel: "Admin",
        });
      });

      return res.json({ success: true, recipients });
    }

    if (role === "admin") {
      // Admin oversees every branch — recipient list is every principal
      // and every shadow teacher across the school, plus every parent.
      const [principals, teachers, parents] = await Promise.all([
        User.find({ role: "principal" }).select("name branch"),
        User.find({ role: "shadow_teacher" }).select("name"),
        User.find({ role: "parent" }).select("name"),
      ]);

      const recipients = [
        ...principals.map((p) => ({
          id: p._id,
          name: p.name,
          roleLabel: `Principal (${p.branch})`,
        })),
        ...teachers.map((t) => ({
          id: t._id,
          name: t.name,
          roleLabel: "Shadow Teacher",
        })),
        ...parents.map((p) => ({
          id: p._id,
          name: p.name,
          roleLabel: "Parent",
        })),
      ];

      return res.json({ success: true, recipients });
    }

    return res.status(403).json({
      success: false,
      message: "This role does not have a recipient list",
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

// @route   GET /api/messages/:id/attachment
// @access  Sender or recipient of that specific message only
// Streams the attachment. Replaces the old unauthenticated static
// /uploads mount — only the two people party to this message can ever
// pull the file down, not anyone with the URL.
export const downloadAttachment = async (req, res) => {
  const { id } = req.params;

  try {
    const message = await Message.findById(id);
    if (!message || !message.attachmentPath) {
      return res.status(404).json({
        success: false,
        message: "Attachment not found",
      });
    }

    const isParty =
      message.sender.toString() === req.user.id ||
      message.recipient.toString() === req.user.id;

    if (!isParty) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this attachment",
      });
    }

    res.download(
      message.attachmentPath,
      message.attachmentName || "attachment",
      (err) => {
        if (err && !res.headersSent) {
          console.error(err);
          res.status(404).json({
            success: false,
            message: "File could not be found on the server",
          });
        }
      }
    );
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
