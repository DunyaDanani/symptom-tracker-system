import Student, { BRANCHES } from "../models/Student.js";
import User from "../models/User.js";
import Message from "../models/Message.js";
import TeacherAssignmentRequest, {
  OPEN_REQUEST_STATUSES,
} from "../models/TeacherAssignmentRequest.js";

// See models/TeacherAssignmentRequest.js for the full flow:
// admin -> branch principal -> shadow teacher -> admin assigns.

// The request is "with the teacher" once the principal has forwarded it.
// "approved" is the legacy principal-only approval, handled the same way.
const AWAITING_TEACHER = ["forwarded", "approved"];

// Fire-and-forget in-app message so each step shows up in the other
// person's Messages inbox / notification bell. A failure here is logged but
// never undoes the request change itself.
const notify = async ({ from, to, body }) => {
  if (!from?._id && !from?.id) return;
  if (!to) return;
  try {
    const recipient = await User.findById(to).select("role");
    if (!recipient) return;
    await Message.create({
      sender: from._id || from.id,
      senderRole: from.role,
      recipient: recipient._id,
      recipientRole: recipient.role,
      category: "Teacher Assignment",
      body,
    });
  } catch (err) {
    console.error("Failed to send teacher-assignment message", err);
  }
};

const COMMUNICATION_LABEL = {
  "non-verbal": "Non-verbal",
  "partially-verbal": "Partially verbal",
  verbal: "Verbal",
};
const CATEGORY_LABEL = { national: "National", cambridge: "Cambridge" };

// "Adam Parker — Grade 7 (National)\nCondition: ASD · Communication: Partially verbal"
export const describeStudent = (r) => {
  if (!r?.studentName) return "";
  const grade = [r.studentGrade, CATEGORY_LABEL[r.studentProgramCategory]]
    .filter(Boolean)
    .join(" · ");
  const lines = [`Student: ${r.studentName}${grade ? ` (${grade})` : ""}`];
  const condition = [
    r.studentDiagnosis && `Condition: ${r.studentDiagnosis}`,
    r.studentCommunicationLevel &&
      `Communication: ${COMMUNICATION_LABEL[r.studentCommunicationLevel] || r.studentCommunicationLevel}`,
  ].filter(Boolean);
  if (condition.length) lines.push(condition.join(" · "));
  return lines.join("\n");
};

const withStudent = (text, r) => {
  const details = describeStudent(r);
  return details ? `${text}\n\n${details}` : text;
};

const principalsOf = (branch) =>
  User.find({ role: "principal", branch }).select("_id");

const serverError = (res, error) => {
  console.error(error);
  res.status(500).json({ success: false, message: "Server Error" });
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

// @route   POST /api/students/teachers/:id/request-assignment
// @access  Admin only
// Body: { studentId, note? } — the already-admitted child the teacher is
// being requested for. The request goes to that child's branch principal.
export const createTeacherAssignmentRequest = async (req, res) => {
  const { id } = req.params;
  const { note, studentId } = req.body;
  let { branch } = req.body;

  try {
    // The child is admitted first; the request is always for that
    // existing student, so the teacher can be assigned automatically the
    // moment they accept.
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Admit the student first, then request a shadow teacher for them",
      });
    }
    const existingStudent = await Student.findById(studentId);
    if (!existingStudent) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }
    if (existingStudent.assignedTeacher) {
      return res.status(400).json({
        success: false,
        message: "This student already has a shadow teacher. Remove them first.",
      });
    }
    // One in-progress request per student, so two teachers can't both be
    // asked (and both accept) for the same child.
    const openForStudent = await TeacherAssignmentRequest.findOne({
      student: existingStudent._id,
      status: { $in: OPEN_REQUEST_STATUSES },
    }).populate("teacher", "name");
    if (openForStudent) {
      return res.status(409).json({
        success: false,
        message: `${existingStudent.fullName} already has a request in progress for ${openForStudent.teacher?.name || "another teacher"}. Cancel it first.`,
        request: openForStudent,
      });
    }
    branch = existingStudent.branch;
    const studentSnapshot = {
      student: existingStudent._id,
      studentName: existingStudent.fullName,
      studentGrade: existingStudent.grade,
      studentProgramCategory: existingStudent.programCategory,
      studentDiagnosis: existingStudent.diagnosis,
      studentCommunicationLevel: existingStudent.communicationLevel,
    };

    if (!BRANCHES.includes(branch)) {
      return res.status(400).json({
        success: false,
        message: "Choose the branch the new child is joining first",
      });
    }

    const teacher = await User.findOne({ _id: id, role: "shadow_teacher" });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Shadow teacher not found",
      });
    }

    // One in-progress request per teacher, whoever asked. Prevents two
    // admins (or one admin clicking twice) negotiating the same teacher
    // for two different children at once.
    const existing = await TeacherAssignmentRequest.findOne({
      teacher: id,
      status: { $in: OPEN_REQUEST_STATUSES },
    });
    if (existing) {
      const sameRequest = existing.student?.toString() === String(studentId);
      return res.status(sameRequest ? 200 : 409).json({
        success: sameRequest,
        message: sameRequest
          ? "A request for this teacher is already in progress"
          : `This teacher already has a request in progress${existing.studentName ? ` for ${existing.studentName}` : ""} (${existing.branch}). Cancel it first to request them for another child.`,
        request: existing,
      });
    }

    const principals = await principalsOf(branch);
    if (principals.length === 0) {
      return res.status(400).json({
        success: false,
        message: `${branch} has no branch principal account yet, so there's no one to approve this request.`,
      });
    }

    let request;
    try {
      request = await TeacherAssignmentRequest.create({
        teacher: id,
        requestedBy: req.user.id,
        branch,
        note: note ? String(note).trim() : "",
        ...studentSnapshot,
      });
    } catch (err) {
      // Lost a race with another admin's request for the same teacher.
      if (err.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Another request for this teacher was just created. Refresh and try again.",
        });
      }
      throw err;
    }

    await Promise.all(
      principals.map((p) =>
        notify({
          from: req.user,
          to: p._id,
          body: withStudent(
            `Request to assign shadow teacher ${teacher.name} to a child joining ${branch}.` +
              (request.note ? `\n\nNote: ${request.note}` : "") +
              "\n\nReview it under Teacher Requests to send it on to the teacher or deny it.",
            request
          ),
        })
      )
    );

    res.status(201).json({
      success: true,
      message: `Request sent to the ${branch} branch principal`,
      request,
    });
  } catch (error) {
    serverError(res, error);
  }
};

// Cancels an in-progress request and tells everyone it had reached.
// Used by both the admin and the branch principal.
const cancelRequest = async (req, res, filter, cancelledByLabel) => {
  try {
    const request = await TeacherAssignmentRequest.findOne(filter).populate(
      "teacher",
      "name"
    );
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    if (!OPEN_REQUEST_STATUSES.includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: `This request is already ${request.status} and can't be cancelled`,
      });
    }

    const wasWithTeacher =
      AWAITING_TEACHER.includes(request.status) || request.status === "accepted";

    const reason = req.body?.reason ? String(req.body.reason).trim() : "";
    request.status = "cancelled";
    request.cancelledBy = req.user.id;
    request.cancelledAt = new Date();
    if (reason) request.denialReason = reason;
    await request.save();

    const body = withStudent(
      `The request to assign ${request.teacher?.name || "this teacher"} as shadow teacher for ${request.studentName || "a new child"} in ${request.branch} has been cancelled by ${cancelledByLabel}.` +
        (reason ? `\n\nReason: ${reason}` : ""),
      request
    );
    const recipients = new Set();
    if (req.user.role !== "principal") {
      (await principalsOf(request.branch)).forEach((p) => recipients.add(p._id.toString()));
    }
    if (request.requestedBy.toString() !== req.user.id) {
      recipients.add(request.requestedBy.toString());
    }
    if (wasWithTeacher && request.teacher?._id) {
      recipients.add(request.teacher._id.toString());
    }
    await Promise.all([...recipients].map((to) => notify({ from: req.user, to, body })));

    res.json({ success: true, message: "Request cancelled", request });
  } catch (error) {
    serverError(res, error);
  }
};

// @route   PATCH /api/students/teacher-requests/:id/cancel
// @access  Admin only — any admin can withdraw an in-progress request
export const cancelTeacherAssignmentRequest = (req, res) =>
  cancelRequest(req, res, { _id: req.params.id }, "the admin");

// @route   PATCH /api/principal/teacher-requests/:id/cancel
// @access  Principal — requests for their own branch only. Body: { reason? }
export const cancelTeacherAssignmentRequestAsPrincipal = (req, res) =>
  cancelRequest(
    req,
    res,
    { _id: req.params.id, branch: req.user.branch },
    `the ${req.user.branch} branch principal`
  );

// @route   GET /api/students/teacher-requests/mine
// @access  Admin only — every in-progress request plus recent outcomes,
// across all admins (a teacher can only have one open request).
export const listMyTeacherAssignmentRequests = async (req, res) => {
  try {
    const requests = await TeacherAssignmentRequest.find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("teacher", "name username")
      .populate("requestedBy", "name");

    res.json({ success: true, requests });
  } catch (error) {
    serverError(res, error);
  }
};

// ---------------------------------------------------------------------------
// Principal
// ---------------------------------------------------------------------------

// @route   GET /api/principal/teacher-requests?status=pending|all
// @access  Principal only — scoped to req.user.branch
export const listTeacherAssignmentRequestsForPrincipal = async (req, res) => {
  const status = req.query.status === "all" ? null : "pending";

  try {
    const filter = { branch: req.user.branch };
    if (status) filter.status = status;

    const requests = await TeacherAssignmentRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("teacher", "name username")
      .populate("requestedBy", "name")
      .populate("reviewedBy", "name");

    // Context so the principal isn't deciding blind: who the teacher is
    // with right now, and where they've worked before.
    const teacherIds = requests.map((r) => r.teacher?._id).filter(Boolean);
    const related = await Student.find({
      "teacherHistory.teacher": { $in: teacherIds },
    }).select("fullName branch assignedTeacher status teacherHistory");

    const current = {};
    const previous = {};
    related.forEach((s) => {
      s.teacherHistory.forEach((h) => {
        const key = h.teacher.toString();
        const entry = { _id: s._id, name: s.fullName, branch: s.branch };
        if (!h.removedAt && s.assignedTeacher?.toString() === key) {
          (current[key] ||= []).push(entry);
        } else {
          (previous[key] ||= []).push(entry);
        }
      });
    });

    const enriched = requests.map((r) => {
      const key = r.teacher?._id?.toString();
      return {
        ...r.toObject(),
        currentStudents: key ? current[key] || [] : [],
        previousStudents: key ? previous[key] || [] : [],
      };
    });

    res.json({ success: true, requests: enriched });
  } catch (error) {
    serverError(res, error);
  }
};

// @route   GET /api/principal/teacher-requests/pending-count
// @access  Principal only — scoped to req.user.branch
export const getPendingTeacherAssignmentRequestCount = async (req, res) => {
  try {
    const count = await TeacherAssignmentRequest.countDocuments({
      branch: req.user.branch,
      status: "pending",
    });
    res.json({ success: true, count });
  } catch (error) {
    serverError(res, error);
  }
};

// @route   PATCH /api/principal/teacher-requests/:id
// @access  Principal only — scoped to req.user.branch
// Body: { action: "forward" | "deny", message?, reason? }
// "approve" is accepted as an alias for "forward".
export const reviewTeacherAssignmentRequest = async (req, res) => {
  const { id } = req.params;
  const action = req.body.action === "approve" ? "forward" : req.body.action;
  const { message, reason } = req.body;

  try {
    if (!["forward", "deny"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'forward' or 'deny'",
      });
    }

    const request = await TeacherAssignmentRequest.findOne({
      _id: id,
      branch: req.user.branch,
    }).populate("teacher", "name");

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found in your branch",
      });
    }
    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `This request is already ${request.status}`,
      });
    }

    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();

    if (action === "deny") {
      request.status = "denied";
      request.denialReason = reason ? String(reason).trim() : "";
      await request.save();
      await notify({
        from: req.user,
        to: request.requestedBy,
        body: withStudent(
          `The ${request.branch} principal denied the request to assign ${request.teacher?.name} to ${request.studentName || "the new child"}.` +
            (request.denialReason ? `\n\nReason: ${request.denialReason}` : ""),
          request
        ),
      });
      return res.json({ success: true, message: "Request denied", request });
    }

    const principalMessage =
      (message && String(message).trim()) ||
      `Hello ${request.teacher?.name}, we have a child${request.studentName ? `, ${request.studentName},` : ""} joining ${request.branch} and would like you to be their shadow teacher. Please accept or decline under Shadow Teacher Assignment Requests.`;

    request.status = "forwarded";
    request.principalMessage = principalMessage;
    await request.save();

    // Student details are appended so the teacher always sees who the
    // child is and their condition, even if the principal's own message
    // doesn't mention it.
    await notify({
      from: req.user,
      to: request.teacher?._id,
      body: withStudent(principalMessage, request),
    });

    res.json({
      success: true,
      message: "Sent to the teacher — waiting for them to accept",
      request,
    });
  } catch (error) {
    serverError(res, error);
  }
};

// ---------------------------------------------------------------------------
// Shadow teacher
// ---------------------------------------------------------------------------

// @route   GET /api/teacher/assignment-requests
// @access  Shadow teacher — only requests the principal has sent on to them
export const listMyAssignmentRequestsAsTeacher = async (req, res) => {
  try {
    const requests = await TeacherAssignmentRequest.find({
      teacher: req.user.id,
      status: { $in: [...AWAITING_TEACHER, "accepted", "declined", "fulfilled", "cancelled"] },
      // Cancelled ones only matter if they'd reached the teacher.
      $or: [{ status: { $ne: "cancelled" } }, { reviewedAt: { $ne: null } }],
    })
      .sort({ createdAt: -1 })
      .populate("reviewedBy", "name");

    res.json({ success: true, requests });
  } catch (error) {
    serverError(res, error);
  }
};

// @route   GET /api/teacher/assignment-requests/pending-count
// @access  Shadow teacher
export const getMyPendingAssignmentRequestCount = async (req, res) => {
  try {
    const count = await TeacherAssignmentRequest.countDocuments({
      teacher: req.user.id,
      status: { $in: AWAITING_TEACHER },
    });
    res.json({ success: true, count });
  } catch (error) {
    serverError(res, error);
  }
};

// @route   PATCH /api/teacher/assignment-requests/:id
// @access  Shadow teacher — their own requests only
// Body: { action: "accept" | "decline", reason? }
export const respondToAssignmentRequest = async (req, res) => {
  const { action, reason } = req.body;

  try {
    if (!["accept", "decline"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'accept' or 'decline'",
      });
    }

    const request = await TeacherAssignmentRequest.findOne({
      _id: req.params.id,
      teacher: req.user.id,
    });
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    if (!AWAITING_TEACHER.includes(request.status)) {
      return res.status(400).json({
        success: false,
        message:
          request.status === "cancelled"
            ? "This request has been cancelled"
            : `This request is already ${request.status}`,
      });
    }

    request.status = action === "accept" ? "accepted" : "declined";
    request.teacherRespondedAt = new Date();
    if (action === "decline") request.declineReason = reason ? String(reason).trim() : "";

    // Accepting places the teacher with the child straight away. The
    // update is conditional on the child still having no teacher, so two
    // acceptances can never both land on the same child.
    let autoAssigned = false;
    if (action === "accept" && request.student) {
      const assigned = await Student.findOneAndUpdate(
        { _id: request.student, assignedTeacher: null },
        {
          $set: { assignedTeacher: req.user.id, status: "assigned" },
          $push: { teacherHistory: { teacher: req.user.id, assignedAt: new Date() } },
        },
        { returnDocument: "after" }
      );
      if (assigned) {
        autoAssigned = true;
        request.status = "fulfilled";
        request.fulfilledStudent = assigned._id;
      }
    }
    await request.save();

    const me = await User.findById(req.user.id).select("name");
    const child = request.studentName || "a new child";
    const body = withStudent(
      action === "accept"
        ? autoAssigned
          ? `${me?.name || "The teacher"} accepted and is now the shadow teacher for ${child} in ${request.branch}.`
          : `${me?.name || "The teacher"} accepted the request to be shadow teacher for ${child} in ${request.branch}. The admin can now assign them.`
        : `${me?.name || "The teacher"} declined the request to be shadow teacher for ${child} in ${request.branch}.` +
            (request.declineReason ? `\n\nReason: ${request.declineReason}` : ""),
      request
    );

    const principals = await principalsOf(request.branch);
    await Promise.all([
      notify({ from: req.user, to: request.requestedBy, body }),
      ...principals.map((p) => notify({ from: req.user, to: p._id, body })),
    ]);

    res.json({
      success: true,
      message:
        action === "accept"
          ? autoAssigned
            ? `You're now ${child}'s shadow teacher`
            : "Request accepted"
          : "Request declined",
      request,
    });
  } catch (error) {
    serverError(res, error);
  }
};
