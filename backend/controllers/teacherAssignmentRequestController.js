import Student from "../models/Student.js";
import User from "../models/User.js";
import TeacherAssignmentRequest from "../models/TeacherAssignmentRequest.js";

// @route   POST /api/students/teachers/:id/request-assignment
// @access  Admin only
// Body: { note? }
// Admin's ask for permission to assign an already-assigned shadow teacher
// to a second student. Only makes sense if the teacher genuinely has a
// student right now — if not, the admin should just select them directly
// (no request needed).
export const createTeacherAssignmentRequest = async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  try {
    const teacher = await User.findOne({ _id: id, role: "shadow_teacher" });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Shadow teacher not found",
      });
    }

    const currentStudent = await Student.findOne({
      assignedTeacher: id,
      status: "assigned",
    }).sort({ createdAt: -1 });

    if (!currentStudent) {
      return res.status(400).json({
        success: false,
        message:
          "This teacher has no student assigned right now — you can select them directly, no approval needed.",
      });
    }

    // Don't pile up duplicate pending requests if the admin clicks twice —
    // hand back the existing one instead.
    const existingPending = await TeacherAssignmentRequest.findOne({
      teacher: id,
      requestedBy: req.user.id,
      status: "pending",
    });
    if (existingPending) {
      return res.status(200).json({
        success: true,
        message: "A request for this teacher is already pending review",
        request: existingPending,
      });
    }

    const request = await TeacherAssignmentRequest.create({
      teacher: id,
      requestedBy: req.user.id,
      branch: currentStudent.branch,
      note: note ? String(note).trim() : "",
    });

    res.status(201).json({
      success: true,
      message: `Request sent to the ${currentStudent.branch} branch principal`,
      request,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/students/teacher-requests/mine
// @access  Admin only
// Lets the admit-student wizard show each teacher's request status
// (pending / approved / denied) for requests THIS admin made, so it knows
// which already-assigned teachers are cleared to select.
export const listMyTeacherAssignmentRequests = async (req, res) => {
  try {
    const requests = await TeacherAssignmentRequest.find({
      requestedBy: req.user.id,
      status: { $in: ["pending", "approved", "denied"] },
    })
      .sort({ createdAt: -1 })
      .populate("teacher", "name username");

    res.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

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

    // Context is genuinely useful here: what student(s) is this teacher
    // currently assigned to in this branch, so the principal isn't
    // approving blind.
    const teacherIds = requests.map((r) => r.teacher?._id).filter(Boolean);
    const currentAssignments = await Student.find({
      assignedTeacher: { $in: teacherIds },
      status: "assigned",
    }).select("firstName lastName assignedTeacher branch");

    const assignmentsByTeacher = {};
    currentAssignments.forEach((s) => {
      const key = s.assignedTeacher.toString();
      if (!assignmentsByTeacher[key]) assignmentsByTeacher[key] = [];
      assignmentsByTeacher[key].push({
        _id: s._id,
        name: `${s.firstName} ${s.lastName}`,
        branch: s.branch,
      });
    });

    const enriched = requests.map((r) => ({
      ...r.toObject(),
      currentStudents: r.teacher
        ? assignmentsByTeacher[r.teacher._id.toString()] || []
        : [],
    }));

    res.json({
      success: true,
      requests: enriched,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
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

// @route   PATCH /api/principal/teacher-requests/:id
// @access  Principal only — scoped to req.user.branch
// Body: { action: "approve" | "deny", reason? }
export const reviewTeacherAssignmentRequest = async (req, res) => {
  const { id } = req.params;
  const { action, reason } = req.body;

  try {
    if (!["approve", "deny"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'approve' or 'deny'",
      });
    }

    const request = await TeacherAssignmentRequest.findOne({
      _id: id,
      branch: req.user.branch,
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found in your branch",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `This request was already ${request.status}`,
      });
    }

    request.status = action === "approve" ? "approved" : "denied";
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    if (action === "deny") request.denialReason = reason ? String(reason).trim() : "";
    await request.save();

    res.json({
      success: true,
      message:
        action === "approve"
          ? "Request approved — the admin can now assign this teacher"
          : "Request denied",
      request,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
