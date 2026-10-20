import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Student from "../models/Student.js";
import User from "../models/User.js";
import TeacherProfile from "../models/TeacherProfile.js";
import TeacherAssignmentRequest, {
  OPEN_REQUEST_STATUSES,
} from "../models/TeacherAssignmentRequest.js";
import { BRANCHES } from "../models/Student.js";
import SymptomLog, { SYMPTOM_OPTIONS } from "../models/SymptomLog.js";
import EmotionCheckin from "../models/EmotionCheckin.js";
import BreakActivityLog from "../models/BreakActivityLog.js";
import AcademicTerm, { TERMS, endOfDayUTC } from "../models/AcademicTerm.js";
import { termScopeForStudent } from "./academicTermController.js";
import {
  generateParentCredentials,
  generateTeacherCredentials,
} from "../utils/credentialUtils.js";
import {
  evaluateThresholds,
  raiseManualFlagAlert,
  clearManualFlagAlert,
} from "../utils/alertEngine.js";
import { isValidEmail } from "../utils/validators.js";
import { sendEmail } from "../utils/mailer.js";
import { buildReportHtml } from "../utils/reportHtml.js";
import { renderPdfFromHtml } from "../utils/pdfGenerator.js";

// @route   GET /api/students/branches
// @access  Any authenticated user
export const getBranches = (req, res) => {
  res.json({
    success: true,
    branches: BRANCHES,
  });
};


// Looks up the accepted TeacherAssignmentRequest that lets an existing
// shadow teacher be placed with a child in `branch`. Returns
// { ok: true, request } or { ok: false, message } explaining what's missing.
async function findAcceptedRequest(teacherId, branch, session = null) {
  const query = TeacherAssignmentRequest.findOne({
    teacher: teacherId,
    status: { $in: OPEN_REQUEST_STATUSES },
  });
  if (session) query.session(session);
  const request = await query;

  if (!request) {
    return {
      ok: false,
      message:
        "This shadow teacher is already in the system. Request them through the branch principal and wait for the teacher to accept before assigning them.",
    };
  }
  if (request.branch !== branch) {
    return {
      ok: false,
      message: `This teacher's request is for ${request.branch}, not ${branch}. Cancel it and request them again for ${branch}.`,
    };
  }
  if (request.status !== "accepted") {
    return {
      ok: false,
      message:
        request.status === "pending"
          ? "The branch principal hasn't reviewed this request yet."
          : "The teacher hasn't accepted this request yet.",
    };
  }
  return { ok: true, request };
}

// @route   POST /api/students
// @access  Admin only
// Creates the Student record plus auto-generated login accounts for the
// student and parent. Optionally links an existing teacher or creates a new one.
export const registerStudent = async (req, res) => {
  const {
    branch,
    admissionNumber,
    fullName,
    dateOfBirth,
    gender,
    programCategory,
    grade,
    section,
    diagnosis,
    communicationLevel,
    additionalNotes,
    parentTitle,
    parentFirstName,
    parentRelationship,
    parentEmail,
    parentPhone,
    homeCity,
    assignedTeacherId, // optional - existing teacher's User _id
    newTeacher, // optional - { title, name, age, qualification, specialization, experienceYears, email, phone, nic }
  } = req.body;

  if (
    !branch ||
    !admissionNumber ||
    !fullName ||
    !dateOfBirth ||
    !gender ||
    !programCategory ||
    !grade ||
    !diagnosis ||
    !parentFirstName ||
    !parentEmail ||
    !parentPhone
  ) {
    return res.status(400).json({
      success: false,
      message: "Missing required student or parent fields",
    });
  }

  if (!isValidEmail(parentEmail)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid parent email address",
    });
  }

  if (!BRANCHES.includes(branch)) {
    return res.status(400).json({
      success: false,
      message: "Invalid branch",
    });
  }

  if (!["national", "cambridge"].includes(programCategory)) {
    return res.status(400).json({
      success: false,
      message: "Invalid category",
    });
  }

  // Everything below that writes to the DB (student/parent/teacher User
  // docs, the TeacherProfile, and the Student record itself) runs inside a
  // single transaction. Previously these were five separate saves with no
  // atomicity: if a later step failed — e.g. two admins submitting the same
  // admission number at the same instant, so both passed the pre-check
  // above and only the second Student.save() hit the unique-index error —
  // the User accounts already created for that request were left behind as
  // orphans with no matching Student record. Now any failure rolls
  // everything back together. Requires Mongo to be running as a replica set
  // (it already is here — that's what local.oplog.rs is for); a bare
  // standalone mongod cannot run transactions.
  const session = await mongoose.startSession();
  let credentials;
  let student;
  let teacherEmailPayload = null;

  try {
    session.startTransaction();

    const existingAdmissionNumber = await Student.findOne({
      admissionNumber: admissionNumber.trim(),
    }).session(session);
    if (existingAdmissionNumber) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "A student with this admission number already exists",
      });
    }

    credentials = {};

    // Note: the child no longer gets a login account. There is no child
    // dashboard — emotion check-ins are recorded by the shadow teacher on
    // the child's behalf (see teacherController.submitChildEmojiCheckin /
    // submitEmotionCheckin), so a separate student User + credentials
    // would never be used.

    // 1. Create the parent's login account — username = first name + last
    // 3 digits of the student's admission number, password = same.
    const { username: parentUsername, password: parentTempPassword } =
      await generateParentCredentials(parentFirstName, admissionNumber, User, session);
    const parentHashedPassword = await bcrypt.hash(parentTempPassword, 10);

    const parentUser = new User({
      username: parentUsername,
      password: parentHashedPassword,
      role: "parent",
      name: parentFirstName,
    });
    await parentUser.save({ session });

    credentials.parent = {
      username: parentUsername,
      password: parentTempPassword,
    };

    // 3. Resolve the assigned teacher (existing or newly created)
    let assignedTeacher = null;
    let status = "unassigned";
    let fulfilledRequestId = null;

    if (assignedTeacherId) {
      const teacher = await User.findOne({
        _id: assignedTeacherId,
        role: "shadow_teacher",
      }).session(session);

      if (!teacher) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Selected teacher not found or is not a shadow teacher",
        });
      }

      // An existing shadow teacher (currently with a student, or kept on
      // file from an earlier placement) can only be placed with a new child
      // once the branch principal has passed the request on and the teacher
      // has accepted it — see TeacherAssignmentRequest. Re-checked here so
      // the rule holds even if the wizard's list is stale or bypassed.
      const acceptedRequest = await findAcceptedRequest(
        assignedTeacherId,
        branch,
        session
      );
      if (!acceptedRequest.ok) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: acceptedRequest.message,
        });
      }
      fulfilledRequestId = acceptedRequest.request._id;

      assignedTeacher = teacher._id;
      status = "assigned";
    } else if (newTeacher && newTeacher.name) {
      // Username = teacher's first name + last 3 digits of this student's
      // admission number, password = same.
      const { username: teacherUsername, password: teacherTempPassword } =
        await generateTeacherCredentials(newTeacher.name, admissionNumber, User, session);
      const teacherHashedPassword = await bcrypt.hash(teacherTempPassword, 10);

      const trimmedTeacherEmail = newTeacher.email
        ? newTeacher.email.trim().toLowerCase()
        : "";
      if (!trimmedTeacherEmail) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "An email address is required for the shadow teacher",
        });
      }
      if (!isValidEmail(trimmedTeacherEmail)) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address for the shadow teacher",
        });
      }

      const existingTeacherEmail = await User.findOne({
        email: trimmedTeacherEmail,
      }).session(session);
      if (existingTeacherEmail) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "That teacher email is already linked to another account",
        });
      }

      const teacherUser = new User({
        username: teacherUsername,
        password: teacherHashedPassword,
        role: "shadow_teacher",
        title: newTeacher.title || "",
        name: newTeacher.name,
        email: trimmedTeacherEmail || null,
        phone: newTeacher.phone ? newTeacher.phone.trim() : null,
      });
      await teacherUser.save({ session });

      await TeacherProfile.create(
        [
          {
            user: teacherUser._id,
            age: newTeacher.age,
            qualification: newTeacher.qualification,
            specialization: newTeacher.specialization,
            experienceYears: newTeacher.experienceYears,
            nic: newTeacher.nic ? newTeacher.nic.trim() : "",
          },
        ],
        { session }
      );

      assignedTeacher = teacherUser._id;
      status = "assigned";

      credentials.teacher = {
        username: teacherUsername,
        password: teacherTempPassword,
      };

      // Email is sent after the transaction commits (below) — never from
      // inside it, so a slow/unreachable SMTP server can't hold the
      // transaction open or get rolled back along with an unrelated later
      // failure.
      if (trimmedTeacherEmail) {
        teacherEmailPayload = {
          to: trimmedTeacherEmail,
          teacherName: newTeacher.name,
          teacherUsername,
          teacherTempPassword,
        };
      }
    }

    // 4. Create the Student profile linking everything together
    const newStudent = new Student({
      branch,
      admissionNumber: admissionNumber.trim(),
      fullName,
      dateOfBirth,
      gender,
      programCategory,
      grade,
      section,
      diagnosis,
      communicationLevel,
      additionalNotes,
      parentTitle: parentTitle || "",
      parentFirstName,
      parentRelationship,
      parentEmail,
      parentPhone,
      homeCity,
      parentUser: parentUser._id,
      assignedTeacher,
      status,
      teacherHistory: assignedTeacher ? [{ teacher: assignedTeacher }] : [],
    });

    await newStudent.save({ session });
    student = newStudent;

    // A used approval is spent — it doesn't grant standing permission for
    // any further students beyond this one.
    // Conditional on still being "accepted" so the same acceptance can't
    // be spent twice by two admissions racing each other.
    if (fulfilledRequestId) {
      const spent = await TeacherAssignmentRequest.findOneAndUpdate(
        { _id: fulfilledRequestId, status: "accepted" },
        { status: "fulfilled", isOpen: false, fulfilledStudent: newStudent._id },
        { session, returnDocument: "after" }
      );
      if (!spent) {
        await session.abortTransaction();
        return res.status(409).json({
          success: false,
          message:
            "That teacher's acceptance was just used or cancelled. Refresh the teacher list and try again.",
        });
      }
    }

    await session.commitTransaction();
  } catch (error) {
    if (session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error("Failed to abort transaction:", abortError);
      }
    }
    console.error(error);

    // A duplicate-key error here means two requests raced past the
    // pre-checks above at the same instant (same admission number or, far
    // more rarely, the same generated username). Everything this request
    // had written was just rolled back, so it's safe — and much clearer for
    // the admin — to ask for a retry instead of surfacing a generic 500.
    if (error && error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "That admission number (or a generated username) was just taken by another request. Please try again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  } finally {
    session.endSession();
  }

  // Emails are best-effort and only sent now that the transaction has
  // committed — a failed send here can no longer undo a successful
  // registration, and never rolls back the DB changes.
  let emailSent = false;
  try {
    await sendEmail({
      to: parentEmail,
      subject: "Your OKI International School account",
      html: `
        <p>Hello ${parentTitle ? `${parentTitle} ` : ""}${parentFirstName},</p>
        <p>${fullName} has been admitted successfully. Here are your login credentials:</p>
        <p>
          <strong>Parent login</strong><br/>
          Username: ${credentials.parent.username}<br/>
          Password: ${credentials.parent.password}
        </p>
        <p>Please log in and change this password when convenient.</p>
      `,
    });
    emailSent = true;
  } catch (emailError) {
    console.error("Failed to email admission credentials:", emailError);
  }

  if (teacherEmailPayload) {
    try {
      await sendEmail({
        to: teacherEmailPayload.to,
        subject: "Your OKI International School shadow teacher account",
        html: `
          <p>Hello ${teacherEmailPayload.teacherName},</p>
          <p>A Shadow Teacher account has been created for you. Here are your login credentials:</p>
          <p>
            Username: ${teacherEmailPayload.teacherUsername}<br/>
            Password: ${teacherEmailPayload.teacherTempPassword}
          </p>
          <p>Please log in and change your password when convenient.</p>
        `,
      });
      credentials.teacher.emailSent = true;
    } catch (emailError) {
      console.error("Failed to email teacher credentials:", emailError);
      credentials.teacher.emailSent = false;
    }
  }

  res.status(201).json({
    success: true,
    message: "Student registered successfully",
    student,
    credentials,
    emailSent,
  });
};

// @route   GET /api/students
// @access  Admin only
export const getAllStudents = async (req, res) => {
  try {
    const students = await Student.find()
      .populate("assignedTeacher", "name username email phone")
      .populate("teacherHistory.teacher", "name username")
      .populate("parentUser", "name username")
      .populate("studentUser", "name username")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      students,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/students/teachers
// @access  Admin only
// Returns all shadow teachers with their profile info, so the admin can
// search/select one when assigning a student.
export const getAvailableTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: "shadow_teacher" }).select(
      "name username email phone"
    );

    const teacherIds = teachers.map((t) => t._id);
    const profiles = await TeacherProfile.find({
      user: { $in: teacherIds },
    });

    const profileMap = {};
    profiles.forEach((p) => {
      profileMap[p.user.toString()] = p;
    });

    // Where each teacher is now and where they've been. teacherHistory
    // keeps a record after a student is moved away from a teacher, so a
    // teacher with no current student still shows their last branch.
    const placements = await Student.find({
      "teacherHistory.teacher": { $in: teacherIds },
    }).select("fullName branch assignedTeacher teacherHistory");

    const placementInfo = {};
    placements.forEach((st) => {
      st.teacherHistory.forEach((h) => {
        const key = h.teacher.toString();
        const info = (placementInfo[key] ||= {
          current: [],
          previous: [],
          lastBranch: null,
          lastAt: 0,
        });
        const isCurrent =
          !h.removedAt && st.assignedTeacher?.toString() === key;
        (isCurrent ? info.current : info.previous).push({
          _id: st._id,
          name: st.fullName,
          branch: st.branch,
        });
        const at = new Date(h.removedAt || Date.now()).getTime();
        if (at >= info.lastAt) {
          info.lastAt = at;
          info.lastBranch = st.branch;
        }
      });
    });

    // Students admitted before teacherHistory existed only have
    // assignedTeacher — count those as current placements too.
    const legacyAssigned = await Student.find({
      assignedTeacher: { $in: teacherIds },
      status: "assigned",
      "teacherHistory.0": { $exists: false },
    }).select("fullName branch assignedTeacher");
    legacyAssigned.forEach((st) => {
      const key = st.assignedTeacher.toString();
      const info = (placementInfo[key] ||= {
        current: [],
        previous: [],
        lastBranch: null,
        lastAt: 0,
      });
      info.current.push({ _id: st._id, name: st.fullName, branch: st.branch });
      info.lastBranch ||= st.branch;
    });

    // The teacher's in-progress request (any admin — only one can be open
    // per teacher), or else their most recent finished one so the wizard
    // can show "Declined" / "Denied" with the reason.
    const requests = await TeacherAssignmentRequest.find({
      teacher: { $in: teacherIds },
      status: { $ne: "fulfilled" },
    })
      .sort({ createdAt: -1 })
      .populate("requestedBy", "name");

    const requestByTeacher = {};
    requests.forEach((r) => {
      const key = r.teacher.toString();
      const existing = requestByTeacher[key];
      const isOpen = (x) => OPEN_REQUEST_STATUSES.includes(x.status);
      if (!existing || (!isOpen(existing) && isOpen(r))) requestByTeacher[key] = r;
    });

    const merged = teachers.map((t) => {
      const key = t._id.toString();
      const info = placementInfo[key] || { current: [], previous: [], lastBranch: null };
      const request = requestByTeacher[key];
      return {
        _id: t._id,
        name: t.name,
        username: t.username,
        email: t.email || null,
        phone: t.phone || null,
        qualification: profileMap[key]?.qualification || "",
        specialization: profileMap[key]?.specialization || "",
        experienceYears: profileMap[key]?.experienceYears || 0,
        age: profileMap[key]?.age || null,
        nic: profileMap[key]?.nic || "",
        isAssigned: info.current.length > 0,
        currentStudents: info.current,
        previousStudents: info.previous,
        lastBranch: info.lastBranch,
        request: request
          ? {
              _id: request._id,
              status: request.status,
              branch: request.branch,
              isOpen: OPEN_REQUEST_STATUSES.includes(request.status),
              requestedBy: request.requestedBy?.name || null,
              studentName: request.studentName || "",
              denialReason: request.denialReason,
              declineReason: request.declineReason,
            }
          : null,
        // Kept for older callers.
        myRequestStatus: request?.status || null,
        myRequestId: request?._id || null,
      };
    });

    res.json({
      success: true,
      teachers: merged,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   PATCH /api/students/:studentId/teacher
// @access  Admin only
// Body: { action: "remove" } — moves the student away from their shadow
//         teacher. The teacher's account, profile and placement history are
//         kept, so they can be requested again for another child.
// Body: { action: "assign", teacherId } — places an existing teacher with
//         this (currently teacher-less) student. Needs the same accepted
//         request as admission does.
export const setStudentTeacher = async (req, res) => {
  const { studentId } = req.params;
  const { action, teacherId } = req.body;

  try {
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    if (action === "remove") {
      if (!student.assignedTeacher) {
        return res.status(400).json({
          success: false,
          message: "This student has no shadow teacher to remove",
        });
      }
      const now = new Date();
      const current = student.teacherHistory.find(
        (h) =>
          !h.removedAt &&
          h.teacher.toString() === student.assignedTeacher.toString()
      );
      if (current) current.removedAt = now;
      else
        // Admitted before history existed — record the placement now so
        // the teacher's past branch isn't lost.
        student.teacherHistory.push({
          teacher: student.assignedTeacher,
          assignedAt: student.createdAt,
          removedAt: now,
        });
      student.assignedTeacher = null;
      student.status = "unassigned";
      await student.save();
      return res.json({
        success: true,
        message: "Shadow teacher removed. Their details stay on file for future requests.",
        student,
      });
    }

    if (action === "assign") {
      // One shadow teacher per student — remove the current one first.
      if (student.assignedTeacher) {
        return res.status(400).json({
          success: false,
          message: "This student already has a shadow teacher. Remove them first.",
        });
      }
      const teacher = await User.findOne({ _id: teacherId, role: "shadow_teacher" });
      if (!teacher) {
        return res.status(404).json({ success: false, message: "Shadow teacher not found" });
      }

      const found = await findAcceptedRequest(teacherId, student.branch);
      if (!found.ok) {
        return res.status(400).json({ success: false, message: found.message });
      }

      // Spend the acceptance first (conditionally) so it can't be used
      // for two students at once.
      const spent = await TeacherAssignmentRequest.findOneAndUpdate(
        { _id: found.request._id, status: "accepted" },
        { status: "fulfilled", isOpen: false, fulfilledStudent: student._id },
        { returnDocument: "after" }
      );
      if (!spent) {
        return res.status(409).json({
          success: false,
          message: "That acceptance was just used or cancelled. Refresh and try again.",
        });
      }

      student.assignedTeacher = teacher._id;
      student.status = "assigned";
      student.teacherHistory.push({ teacher: teacher._id });
      await student.save();
      return res.json({
        success: true,
        message: `${teacher.name} is now this student's shadow teacher`,
        student,
      });
    }

    res.status(400).json({
      success: false,
      message: "Action must be 'remove' or 'assign'",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   PATCH /api/students/teachers/:id
// @access  Admin only
// Lets admin edit an existing shadow teacher's account (name, email, phone)
// and profile (qualification, specialization, experienceYears, age, nic)
// after creation — mirrors updatePrincipal in staffController.js.
// Body: { name?, email?, phone?, qualification?, specialization?, experienceYears?, age?, nic? }
export const updateTeacherAccount = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    phone,
    qualification,
    specialization,
    experienceYears,
    age,
    nic,
  } = req.body;

  try {
    const teacher = await User.findOne({ _id: id, role: "shadow_teacher" });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Shadow teacher not found",
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
      teacher.email = trimmedEmail || null;
    }

    if (name && name.trim()) teacher.name = name.trim();
    if (typeof phone === "string") teacher.phone = phone.trim() || null;
    await teacher.save();

    let profile = await TeacherProfile.findOne({ user: teacher._id });
    if (!profile) {
      profile = new TeacherProfile({ user: teacher._id });
    }
    if (qualification !== undefined) profile.qualification = qualification;
    if (specialization !== undefined) profile.specialization = specialization;
    if (experienceYears !== undefined)
      profile.experienceYears = Number(experienceYears) || 0;
    if (age !== undefined) profile.age = age === "" ? null : Number(age);
    if (nic !== undefined) profile.nic = nic;
    await profile.save();

    res.json({
      success: true,
      message: "Teacher updated",
      teacher: {
        _id: teacher._id,
        name: teacher.name,
        username: teacher.username,
        email: teacher.email,
        phone: teacher.phone,
        qualification: profile.qualification,
        specialization: profile.specialization,
        experienceYears: profile.experienceYears,
        age: profile.age,
        nic: profile.nic,
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

// @route   GET /api/students/:studentId/history
// @access  Admin, Principal (any student), Parent (only their own child),
// Shadow Teacher (only their assigned student).
// Deliberately NOT exposed to the "child" role — symptom/emotion history is
// only for the adults around the student.
export const getStudentHistory = async (req, res) => {
  const { studentId } = req.params;

  try {
    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (
      req.user.role === "parent" &&
      student.parentUser?.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "This student is not linked to your account",
      });
    }

    if (
      req.user.role === "shadow_teacher" &&
      student.assignedTeacher?.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "This student is not assigned to you",
      });
    }

    if (req.user.role === "principal" && student.branch !== req.user.branch) {
      return res.status(403).json({
        success: false,
        message: "This student is not in your branch",
      });
    }

    const [symptomLogs, emotionCheckins] = await Promise.all([
      SymptomLog.find({ student: studentId })
        .populate("teacher", "name role")
        .sort({ createdAt: -1 }),
      EmotionCheckin.find({ student: studentId }).sort({ createdAt: -1 }),
    ]);

    res.json({
      success: true,
      symptomLogs,
      emotionCheckins,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/students/:studentId/break-activities
// @access  Admin, Principal (any student), Parent (own child), Shadow
// Teacher (assigned student). Client meeting 20 Feb 2026: lets parents see
// what their child did during break time within the school day.
export const getBreakActivities = async (req, res) => {
  const { studentId } = req.params;

  try {
    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (
      req.user.role === "parent" &&
      student.parentUser?.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "This student is not linked to your account",
      });
    }

    if (
      req.user.role === "shadow_teacher" &&
      student.assignedTeacher?.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "This student is not assigned to you",
      });
    }

    const logs = await BreakActivityLog.find({ student: studentId }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/students/:studentId/profile
// @access  Admin, Principal (any student), Parent (own child), Shadow
// Teacher (assigned student). Used by the printable report, which needs
// full student details regardless of which role is generating it.
export const getStudentProfile = async (req, res) => {
  const { studentId } = req.params;

  try {
    const student = await Student.findById(studentId)
      .populate("assignedTeacher", "name username email phone")
      .populate("parentUser", "name username");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (
      req.user.role === "parent" &&
      student.parentUser?._id?.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "This student is not linked to your account",
      });
    }

    if (
      req.user.role === "shadow_teacher" &&
      student.assignedTeacher?._id?.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "This student is not assigned to you",
      });
    }

    if (req.user.role === "principal" && student.branch !== req.user.branch) {
      return res.status(403).json({
        success: false,
        message: "This student is not in your branch",
      });
    }

    res.json({
      success: true,
      student,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/students/child
// @access  Parent only (their own child's profile)
export const getMyChild = async (req, res) => {
  try {
    const student = await Student.findOne({ parentUser: req.user.id })
      .populate("assignedTeacher", "name username email phone")
      .populate("studentUser", "name username");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "No child profile linked to this account",
      });
    }

    res.json({
      success: true,
      student,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/students/linked
// @access  Parent only
// Resolves "my linked student record" for the logged-in parent. (There is
// no child login/dashboard, so this used to also handle the child side of
// the relationship via studentUser — that branch was removed along with
// the child dashboard.)
export const getLinkedStudent = async (req, res) => {
  try {
    const student = await Student.findOne({ parentUser: req.user.id })
      .populate("assignedTeacher", "name username email phone")
      .populate("parentUser", "name username");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "No linked student profile found",
      });
    }

    res.json({
      success: true,
      student,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/students/:studentId/symptom-trends?range=weekly|monthly|quarterly|term
// @access  Child (own only), Parent (own child only), Shadow Teacher
// (assigned only), Class Teacher (own branch only), Admin/Principal
// (any student).
// Returns a bucketed count of symptoms checked over time for the Reports
// chart. "weekly" = one bucket per day for the last 7 days. "monthly" =
// one bucket per week for the last ~5 weeks. "quarterly" = one bucket per
// month for the last ~3 months — client meeting 20 Feb 2026's "3-Month
// Final Conclusion Report". "term" buckets by week across the exact
// start/end date range of one configured Academic Term, so a term's
// conclusion report reflects that term only — not a rolling window.
// Shared by getSymptomTrends and getStudentReportPdf — buckets a student's
// symptom counts over the requested range. Assumes the caller has already
// verified the student exists and the requester has access to it.
// `termWindow` is only used when range === "term": { start: Date, end: Date }
// resolved from the AcademicTerm the caller asked for.
async function computeTrendBuckets(studentId, range, termWindow) {
  const now = new Date();
  const bucketCount = range === "quarterly" ? 3 : range === "monthly" ? 5 : 7;
  // "quarterly" buckets by calendar month rather than a fixed day count,
  // so each bucket cleanly represents "this month / last month / the
  // month before" for the final conclusion report.
  const bucketSizeDays = range === "monthly" ? 7 : 1;

  let rangeStart;
  let rangeEnd = now;

  if (range === "term") {
    rangeStart = new Date(termWindow.start);
    rangeEnd = new Date(termWindow.end);
  } else {
    rangeStart = new Date(now);
    rangeStart.setHours(0, 0, 0, 0);
    if (range === "quarterly") {
      rangeStart.setDate(1);
      rangeStart.setMonth(rangeStart.getMonth() - (bucketCount - 1));
    } else {
      rangeStart.setDate(
        rangeStart.getDate() - bucketCount * bucketSizeDays + 1
      );
    }
  }

  const logs = await SymptomLog.find({
    student: studentId,
    createdAt: { $gte: rangeStart, $lte: rangeEnd },
  }).select("symptoms createdAt");

  let buckets;
  if (range === "term") {
    // Weekly buckets spanning the exact term window, however long it is.
    const totalDays = Math.max(
      1,
      Math.ceil((rangeEnd - rangeStart) / (1000 * 60 * 60 * 24))
    );
    const termBucketCount = Math.min(20, Math.max(1, Math.ceil(totalDays / 7)));
    buckets = Array.from({ length: termBucketCount }, (_, i) => {
      const bucketStart = new Date(rangeStart);
      bucketStart.setDate(bucketStart.getDate() + i * 7);
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setDate(bucketEnd.getDate() + 7);
      if (bucketEnd > rangeEnd) bucketEnd.setTime(rangeEnd.getTime());

      const label = bucketStart.toLocaleDateString("default", {
        month: "short",
        day: "numeric",
      });

      return { label, start: bucketStart, end: bucketEnd, count: 0 };
    });
  } else if (range === "quarterly") {
    buckets = Array.from({ length: bucketCount }, (_, i) => {
      const bucketStart = new Date(rangeStart);
      bucketStart.setMonth(bucketStart.getMonth() + i);
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setMonth(bucketEnd.getMonth() + 1);

      const label = bucketStart.toLocaleDateString("default", {
        month: "short",
        year: "numeric",
      });

      return { label, start: bucketStart, end: bucketEnd, count: 0 };
    });
  } else {
    buckets = Array.from({ length: bucketCount }, (_, i) => {
      const bucketStart = new Date(rangeStart);
      bucketStart.setDate(bucketStart.getDate() + i * bucketSizeDays);
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setDate(bucketEnd.getDate() + bucketSizeDays);

      const label =
        range === "monthly"
          ? `${bucketStart.toLocaleDateString("default", {
              month: "short",
              day: "numeric",
            })}`
          : bucketStart.toLocaleDateString("default", {
              weekday: "short",
            });

      return { label, start: bucketStart, end: bucketEnd, count: 0 };
    });
  }

  for (const log of logs) {
    const bucket = buckets.find(
      (b) => log.createdAt >= b.start && log.createdAt < b.end
    );
    if (bucket) bucket.count += log.symptoms.length;
  }

  return buckets.map((b) => ({ label: b.label, count: b.count }));
}

// Looks up the AcademicTerm matching the requested academicYear + term
// query params, used by both getSymptomTrends and getStudentReportPdf when
// range === "term". Returns null if either param is missing or no matching
// term is configured, so callers can 400 with a clear message.
async function resolveRequestedTermWindow(query, student) {
  const { academicYear, term } = query;
  if (!academicYear || !term) return null;
  // Look the term up in the student's own branch + National/Cambridge
  // calendar — "2026 Term 1" has different dates per calendar.
  const scope = await termScopeForStudent(student);
  const found = await AcademicTerm.findOne({ ...scope, academicYear, term });
  if (!found) return null;
  // endOfDayUTC so the last day of the term is included even for rows
  // saved before end dates were normalised.
  return { start: found.startDate, end: endOfDayUTC(found.endDate) };
}

export const getSymptomTrends = async (req, res) => {
  const { studentId } = req.params;
  const range = ["monthly", "quarterly", "term"].includes(req.query.range)
    ? req.query.range
    : "weekly";

  try {
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (
      (req.user.role === "parent" &&
        student.parentUser?.toString() !== req.user.id) ||
      (req.user.role === "shadow_teacher" &&
        student.assignedTeacher?.toString() !== req.user.id) ||
      (req.user.role === "class_teacher" &&
        student.branch !== req.user.branch) ||
      (req.user.role === "principal" && student.branch !== req.user.branch)
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this student's data",
      });
    }

    let termWindow;
    if (range === "term") {
      termWindow = await resolveRequestedTermWindow(req.query, student);
      if (!termWindow) {
        return res.status(400).json({
          success: false,
          message:
            "Select a valid academic year and term to view a by-term report.",
        });
      }
    }

    const trend = await computeTrendBuckets(studentId, range, termWindow);

    res.json({
      success: true,
      range,
      trend,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/students/:studentId/report.pdf?range=weekly|monthly|quarterly
// @access  Admin, Principal (own branch), Parent (own child), Shadow
// Teacher (assigned), Child (own profile) — same access rules as
// getStudentProfile/getStudentHistory. Renders the same data shown on the
// printable report page as a server-generated PDF (via Puppeteer), so it
// can be downloaded — or later emailed/scheduled — without depending on
// the requester's own browser print dialog.
const REPORT_RANGE_DAYS = { weekly: 7, monthly: 35, quarterly: 92 };

export const getStudentReportPdf = async (req, res) => {
  const { studentId } = req.params;
  const range = ["monthly", "quarterly", "term"].includes(req.query.range)
    ? req.query.range
    : "weekly";

  try {
    const student = await Student.findById(studentId)
      .populate("assignedTeacher", "name username email phone")
      .populate("parentUser", "name username");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (
      req.user.role === "parent" &&
      student.parentUser?._id?.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "This student is not linked to your account",
      });
    }

    if (
      req.user.role === "shadow_teacher" &&
      student.assignedTeacher?._id?.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "This student is not assigned to you",
      });
    }


    if (req.user.role === "principal" && student.branch !== req.user.branch) {
      return res.status(403).json({
        success: false,
        message: "This student is not in your branch",
      });
    }

    let termWindow;
    let termLabel;
    if (range === "term") {
      termWindow = await resolveRequestedTermWindow(req.query, student);
      if (!termWindow) {
        return res.status(400).json({
          success: false,
          message:
            "Select a valid academic year and term to generate a by-term report.",
        });
      }
      termLabel = `${req.query.academicYear} ${req.query.term}`;
    }

    const rangeStart =
      range === "term"
        ? termWindow.start
        : (() => {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - REPORT_RANGE_DAYS[range]);
            return cutoff;
          })();
    const rangeEnd = range === "term" ? termWindow.end : new Date();

    const [symptomLogs, emotionCheckins, trend, requester] = await Promise.all([
      SymptomLog.find({
        student: studentId,
        createdAt: { $gte: rangeStart, $lte: rangeEnd },
      })
        .populate("teacher", "name role")
        .sort({ createdAt: -1 }),
      EmotionCheckin.find({
        student: studentId,
        createdAt: { $gte: rangeStart, $lte: rangeEnd },
      }).sort({ createdAt: -1 }),
      computeTrendBuckets(studentId, range, termWindow),
      User.findById(req.user.id).select("name"),
    ]);

    const html = buildReportHtml({
      student,
      symptomLogs,
      emotionCheckins,
      trend,
      range,
      termLabel,
      generatedBy: requester?.name || "",
    });

    const pdfBuffer = await renderPdfFromHtml(html);

    const fileName = `${student.fullName}-${
      range === "term" ? termLabel : range
    }-report.pdf`.replace(/\s+/g, "_");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Failed to generate report PDF:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate PDF report",
    });
  }
};

// @route   PATCH /api/students/:studentId
// @access  Admin only
// Edits a student's core profile fields captured at admission time. Login
// accounts (studentUser/parentUser), teacher assignment, and the
// flagged/status fields each have their own dedicated flow, so they're
// left untouched here — this only covers the descriptive profile data.
// Every field is optional; only the ones present in the body get updated.
export const updateStudentProfile = async (req, res) => {
  const { studentId } = req.params;
  const {
    branch,
    admissionNumber,
    fullName,
    dateOfBirth,
    gender,
    programCategory,
    grade,
    section,
    diagnosis,
    communicationLevel,
    additionalNotes,
    parentTitle,
    parentFirstName,
    parentRelationship,
    parentEmail,
    parentPhone,
    homeCity,
  } = req.body;

  try {
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (branch !== undefined) {
      if (!BRANCHES.includes(branch)) {
        return res.status(400).json({
          success: false,
          message: "Invalid branch",
        });
      }
      student.branch = branch;
    }

    if (admissionNumber !== undefined) {
      const trimmed = admissionNumber.trim();
      if (!trimmed) {
        return res.status(400).json({
          success: false,
          message: "Admission number is required",
        });
      }
      const existing = await Student.findOne({
        admissionNumber: trimmed,
        _id: { $ne: studentId },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "That admission number is already in use",
        });
      }
      student.admissionNumber = trimmed;
    }

    if (fullName !== undefined) {
      if (!fullName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Full name is required",
        });
      }
      student.fullName = fullName.trim();
    }

    if (programCategory !== undefined) {
      if (!["national", "cambridge"].includes(programCategory)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category",
        });
      }
      student.programCategory = programCategory;
    }

    if (dateOfBirth !== undefined) {
      if (!dateOfBirth) {
        return res.status(400).json({
          success: false,
          message: "Date of birth is required",
        });
      }
      student.dateOfBirth = dateOfBirth;
    }

    if (gender !== undefined) {
      if (!["male", "female", "other"].includes(gender)) {
        return res.status(400).json({
          success: false,
          message: "Invalid gender",
        });
      }
      student.gender = gender;
    }

    if (grade !== undefined) {
      if (!grade.trim()) {
        return res.status(400).json({
          success: false,
          message: "Grade is required",
        });
      }
      student.grade = grade.trim();
    }

    if (section !== undefined) student.section = section.trim();

    if (diagnosis !== undefined) {
      if (!diagnosis.trim()) {
        return res.status(400).json({
          success: false,
          message: "Diagnosis is required",
        });
      }
      student.diagnosis = diagnosis.trim();
    }

    if (communicationLevel !== undefined) {
      if (
        !["verbal", "non-verbal", "partially-verbal"].includes(
          communicationLevel
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid communication level",
        });
      }
      student.communicationLevel = communicationLevel;
    }

    if (additionalNotes !== undefined)
      student.additionalNotes = additionalNotes.trim();

    if (parentTitle !== undefined) {
      if (parentTitle && !["Mr", "Mrs", "Ms"].includes(parentTitle)) {
        return res.status(400).json({
          success: false,
          message: "Invalid parent title",
        });
      }
      student.parentTitle = parentTitle || "";
    }

    if (parentFirstName !== undefined) {
      if (!parentFirstName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Parent name is required",
        });
      }
      student.parentFirstName = parentFirstName.trim();
    }

    if (parentRelationship !== undefined)
      student.parentRelationship = parentRelationship.trim();

    if (parentEmail !== undefined) {
      const trimmedEmail = parentEmail.trim().toLowerCase();
      if (!isValidEmail(trimmedEmail)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid parent email address",
        });
      }
      student.parentEmail = trimmedEmail;
    }

    if (parentPhone !== undefined) {
      if (!parentPhone.trim()) {
        return res.status(400).json({
          success: false,
          message: "Parent phone is required",
        });
      }
      student.parentPhone = parentPhone.trim();
    }

    if (homeCity !== undefined) student.homeCity = homeCity.trim();

    await student.save();

    const populated = await student.populate([
      { path: "assignedTeacher", select: "name username email phone" },
      { path: "parentUser", select: "name username" },
      { path: "studentUser", select: "name username" },
    ]);

    res.json({
      success: true,
      message: "Student profile updated",
      student: populated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   PATCH /api/students/:studentId/flag
// @access  Admin only
// Body: { flagged: boolean, flagNote?: string }
export const adminSetStudentFlag = async (req, res) => {
  const { studentId } = req.params;
  const { flagged, flagNote } = req.body;

  try {
    const student = await Student.findByIdAndUpdate(
      studentId,
      { flagged: Boolean(flagged), flagNote: flagNote || "" },
      { returnDocument: "after" }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // FR-10: manual flags push an alert immediately; unflagging clears it.
    if (flagged) {
      await raiseManualFlagAlert(studentId, flagNote);
    } else {
      await clearManualFlagAlert(studentId);
    }

    res.json({
      success: true,
      message: flagged ? "Student flagged" : "Flag cleared",
      student,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/students/symptom-options
// @access  Admin only
export const getAdminSymptomOptions = (req, res) => {
  res.json({
    success: true,
    options: SYMPTOM_OPTIONS,
  });
};

// @route   POST /api/students/:studentId/symptoms
// @access  Admin only
// Body: { symptoms: string[], additionalNotes, medications?, medicationNotes? }
export const adminCreateSymptomLog = async (req, res) => {
  const { studentId } = req.params;
  const {
    symptoms,
    additionalNotes,
    medications,
    medicationNotes,
    academicYear,
    term,
  } = req.body;

  try {
    if (!symptoms || symptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one symptom",
      });
    }

    if (!academicYear?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Select an academic year",
      });
    }

    if (!TERMS.includes(term)) {
      return res.status(400).json({
        success: false,
        message: "Select a term",
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const log = await SymptomLog.create({
      student: studentId,
      teacher: req.user.id,
      symptoms,
      additionalNotes,
      medications: (medications || []).filter((m) => m?.name?.trim()),
      medicationNotes,
      academicYear: academicYear.trim(),
      term,
    });

    // FR-10: re-check alert thresholds now that a new log exists.
    await evaluateThresholds(studentId);

    res.status(201).json({
      success: true,
      message: "Symptom log added",
      log,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   PUT /api/students/symptoms/:logId
// @access  Admin only
// Body: { symptoms: string[], additionalNotes, medications?, medicationNotes? }
export const adminUpdateSymptomLog = async (req, res) => {
  const { logId } = req.params;
  const {
    symptoms,
    additionalNotes,
    medications,
    medicationNotes,
    academicYear,
    term,
  } = req.body;

  try {
    if (!symptoms || symptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one symptom",
      });
    }

    if (!academicYear?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Select an academic year",
      });
    }

    if (!TERMS.includes(term)) {
      return res.status(400).json({
        success: false,
        message: "Select a term",
      });
    }

    const log = await SymptomLog.findByIdAndUpdate(
      logId,
      {
        symptoms,
        additionalNotes,
        medications: (medications || []).filter((m) => m?.name?.trim()),
        medicationNotes,
        academicYear: academicYear.trim(),
        term,
      },
      { returnDocument: "after", runValidators: true }
    );

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Symptom log not found",
      });
    }

    res.json({
      success: true,
      message: "Symptom log updated",
      log,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   DELETE /api/students/symptoms/:logId
// @access  Admin only
export const adminDeleteSymptomLog = async (req, res) => {
  const { logId } = req.params;

  try {
    const log = await SymptomLog.findByIdAndDelete(logId);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Symptom log not found",
      });
    }

    res.json({
      success: true,
      message: "Symptom log deleted",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   POST /api/students/:studentId/emotion-checkin
// @access  Admin only
// Body: { childEmoji, teacherEmoji }
export const adminCreateEmotionCheckin = async (req, res) => {
  const { studentId } = req.params;
  const { childEmoji, teacherEmoji, academicYear, term } = req.body;

  try {
    if (!childEmoji || !teacherEmoji) {
      return res.status(400).json({
        success: false,
        message: "childEmoji and teacherEmoji are both required",
      });
    }

    if (!academicYear?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Select an academic year",
      });
    }

    if (!TERMS.includes(term)) {
      return res.status(400).json({
        success: false,
        message: "Select a term",
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const checkin = await EmotionCheckin.create({
      student: studentId,
      teacher: req.user.id,
      childEmoji,
      teacherEmoji,
      academicYear: academicYear.trim(),
      term,
    });

    // FR-10: re-check alert thresholds now that a new check-in exists.
    await evaluateThresholds(studentId);

    res.status(201).json({
      success: true,
      message: "Emotion check-in added",
      checkin,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   PUT /api/students/emotion-checkin/:checkinId
// @access  Admin only
// Body: { childEmoji, teacherEmoji }
export const adminUpdateEmotionCheckin = async (req, res) => {
  const { checkinId } = req.params;
  const { childEmoji, teacherEmoji, academicYear, term } = req.body;

  try {
    if (!childEmoji || !teacherEmoji) {
      return res.status(400).json({
        success: false,
        message: "childEmoji and teacherEmoji are both required",
      });
    }

    if (!academicYear?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Select an academic year",
      });
    }

    if (!TERMS.includes(term)) {
      return res.status(400).json({
        success: false,
        message: "Select a term",
      });
    }

    const checkin = await EmotionCheckin.findById(checkinId);

    if (!checkin) {
      return res.status(404).json({
        success: false,
        message: "Emotion check-in not found",
      });
    }

    // Set fields and use .save() (not findByIdAndUpdate) so the pre-save
    // hook recalculates compositeScore from the new emoji values.
    checkin.childEmoji = childEmoji;
    checkin.teacherEmoji = teacherEmoji;
    checkin.academicYear = academicYear.trim();
    checkin.term = term;
    await checkin.save();

    res.json({
      success: true,
      message: "Emotion check-in updated",
      checkin,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   DELETE /api/students/emotion-checkin/:checkinId
// @access  Admin only
export const adminDeleteEmotionCheckin = async (req, res) => {
  const { checkinId } = req.params;

  try {
    const checkin = await EmotionCheckin.findByIdAndDelete(checkinId);

    if (!checkin) {
      return res.status(404).json({
        success: false,
        message: "Emotion check-in not found",
      });
    }

    res.json({
      success: true,
      message: "Emotion check-in deleted",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
