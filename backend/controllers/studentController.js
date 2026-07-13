import bcrypt from "bcrypt";
import Student from "../models/Student.js";
import User from "../models/User.js";
import TeacherProfile from "../models/TeacherProfile.js";
import { BRANCHES } from "../models/Student.js";
import SymptomLog, { SYMPTOM_OPTIONS } from "../models/SymptomLog.js";
import EmotionCheckin, { EMOJI_SCORES } from "../models/EmotionCheckin.js";
import BreakActivityLog from "../models/BreakActivityLog.js";
import {
  generateStudentCredentials,
  generateParentCredentials,
  generateTeacherCredentials,
} from "../utils/credentialUtils.js";
import {
  evaluateThresholds,
  raiseManualFlagAlert,
  clearManualFlagAlert,
} from "../utils/alertEngine.js";
import { buildActivityPlan } from "../utils/activityPlanEngine.js";
import { isValidEmail } from "../utils/validators.js";
import { currentCheckinContext } from "../utils/schoolHours.js";
import { sendEmail } from "../utils/mailer.js";

// @route   GET /api/students/branches
// @access  Any authenticated user
export const getBranches = (req, res) => {
  res.json({
    success: true,
    branches: BRANCHES,
  });
};

// @route   POST /api/students
// @access  Admin only
// Creates the Student record plus auto-generated login accounts for the
// student and parent. Optionally links an existing teacher or creates a new one.
export const registerStudent = async (req, res) => {
  const {
    branch,
    admissionNumber,
    firstName,
    lastName,
    dateOfBirth,
    gender,
    grade,
    section,
    diagnosis,
    communicationLevel,
    additionalNotes,
    parentFirstName,
    parentRelationship,
    parentEmail,
    parentPhone,
    homeCity,
    assignedTeacherId, // optional - existing teacher's User _id
    newTeacher, // optional - { name, age, qualification, specialization, experienceYears }
  } = req.body;

  try {
    if (
      !branch ||
      !admissionNumber ||
      !firstName ||
      !lastName ||
      !dateOfBirth ||
      !gender ||
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

    const existingAdmissionNumber = await Student.findOne({
      admissionNumber: admissionNumber.trim(),
    });
    if (existingAdmissionNumber) {
      return res.status(400).json({
        success: false,
        message: "A student with this admission number already exists",
      });
    }

    const credentials = {};

    // 1. Create the student's login account — username = admission number,
    // password = same, so it's short and easy for a child to use.
    const { username: studentUsername, password: studentTempPassword } =
      await generateStudentCredentials(admissionNumber, User);
    const studentHashedPassword = await bcrypt.hash(studentTempPassword, 10);

    const studentUser = new User({
      username: studentUsername,
      password: studentHashedPassword,
      role: "child",
      name: `${firstName} ${lastName}`,
    });
    await studentUser.save();

    credentials.student = {
      username: studentUsername,
      password: studentTempPassword,
    };

    // 2. Create the parent's login account — username = first name + last
    // 3 digits of their phone number, password = same.
    const { username: parentUsername, password: parentTempPassword } =
      await generateParentCredentials(parentFirstName, parentPhone, User);
    const parentHashedPassword = await bcrypt.hash(parentTempPassword, 10);

    const parentUser = new User({
      username: parentUsername,
      password: parentHashedPassword,
      role: "parent",
      name: parentFirstName,
    });
    await parentUser.save();

    credentials.parent = {
      username: parentUsername,
      password: parentTempPassword,
    };

    // 3. Resolve the assigned teacher (existing or newly created)
    let assignedTeacher = null;
    let status = "unassigned";

    if (assignedTeacherId) {
      const teacher = await User.findOne({
        _id: assignedTeacherId,
        role: "shadow_teacher",
      });

      if (!teacher) {
        return res.status(400).json({
          success: false,
          message: "Selected teacher not found or is not a shadow teacher",
        });
      }

      assignedTeacher = teacher._id;
      status = "assigned";
    } else if (newTeacher && newTeacher.name) {
      // Username = teacher's first name + last 3 digits of this student's
      // admission number, password = same.
      const { username: teacherUsername, password: teacherTempPassword } =
        await generateTeacherCredentials(newTeacher.name, admissionNumber, User);
      const teacherHashedPassword = await bcrypt.hash(teacherTempPassword, 10);

      const trimmedTeacherEmail = newTeacher.email
        ? newTeacher.email.trim().toLowerCase()
        : "";
      if (trimmedTeacherEmail && !isValidEmail(trimmedTeacherEmail)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address for the shadow teacher",
        });
      }
      if (trimmedTeacherEmail) {
        const existingTeacherEmail = await User.findOne({
          email: trimmedTeacherEmail,
        });
        if (existingTeacherEmail) {
          return res.status(400).json({
            success: false,
            message: "That teacher email is already linked to another account",
          });
        }
      }

      const teacherUser = new User({
        username: teacherUsername,
        password: teacherHashedPassword,
        role: "shadow_teacher",
        name: newTeacher.name,
        email: trimmedTeacherEmail || null,
      });
      await teacherUser.save();

      await TeacherProfile.create({
        user: teacherUser._id,
        age: newTeacher.age,
        qualification: newTeacher.qualification,
        specialization: newTeacher.specialization,
        experienceYears: newTeacher.experienceYears,
      });

      assignedTeacher = teacherUser._id;
      status = "assigned";

      credentials.teacher = {
        username: teacherUsername,
        password: teacherTempPassword,
      };

      if (trimmedTeacherEmail) {
        try {
          await sendEmail({
            to: trimmedTeacherEmail,
            subject: "Your OKI International School shadow teacher account",
            html: `
              <p>Hello ${newTeacher.name},</p>
              <p>A Shadow Teacher account has been created for you. Here are your login credentials:</p>
              <p>
                Username: ${teacherUsername}<br/>
                Password: ${teacherTempPassword}
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
    }

    // 4. Create the Student profile linking everything together
    const student = new Student({
      branch,
      admissionNumber: admissionNumber.trim(),
      firstName,
      lastName,
      dateOfBirth,
      gender,
      grade,
      section,
      diagnosis,
      communicationLevel,
      additionalNotes,
      parentFirstName,
      parentRelationship,
      parentEmail,
      parentPhone,
      homeCity,
      studentUser: studentUser._id,
      parentUser: parentUser._id,
      assignedTeacher,
      status,
    });

    await student.save();

    // Email the parent their login credentials. Admission must still
    // succeed even if SMTP isn't reachable/configured — we report back
    // whether the send actually worked so the frontend can show accurate
    // copy instead of unconditionally claiming "credentials sent".
    let emailSent = false;
    try {
      await sendEmail({
        to: parentEmail,
        subject: "Your OKI International School account",
        html: `
          <p>Hello ${parentFirstName},</p>
          <p>${firstName} ${lastName} has been admitted successfully. Here are your login credentials:</p>
          <p>
            <strong>Parent login</strong><br/>
            Username: ${credentials.parent.username}<br/>
            Password: ${credentials.parent.password}
          </p>
          <p>
            <strong>Student login</strong><br/>
            Username: ${credentials.student.username}<br/>
            Password: ${credentials.student.password}
          </p>
          <p>Please log in and change these passwords when convenient.</p>
        `,
      });
      emailSent = true;
    } catch (emailError) {
      console.error("Failed to email admission credentials:", emailError);
    }

    res.status(201).json({
      success: true,
      message: "Student registered successfully",
      student,
      credentials,
      emailSent,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/students
// @access  Admin only
export const getAllStudents = async (req, res) => {
  try {
    const students = await Student.find()
      .populate("assignedTeacher", "name username")
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
      "name username email"
    );

    const teacherIds = teachers.map((t) => t._id);
    const profiles = await TeacherProfile.find({
      user: { $in: teacherIds },
    });

    const profileMap = {};
    profiles.forEach((p) => {
      profileMap[p.user.toString()] = p;
    });

    const merged = teachers.map((t) => ({
      _id: t._id,
      name: t.name,
      username: t.username,
      email: t.email || null,
      qualification: profileMap[t._id.toString()]?.qualification || "",
      specialization: profileMap[t._id.toString()]?.specialization || "",
      experienceYears: profileMap[t._id.toString()]?.experienceYears || 0,
      age: profileMap[t._id.toString()]?.age || null,
    }));

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

// @route   PATCH /api/students/teachers/:id
// @access  Admin only
// Lets admin edit an existing shadow teacher's account (name, email) and
// profile (qualification, specialization, experienceYears, age) after
// creation — mirrors updatePrincipal in staffController.js.
// Body: { name?, email?, qualification?, specialization?, experienceYears?, age? }
export const updateTeacherAccount = async (req, res) => {
  const { id } = req.params;
  const { name, email, qualification, specialization, experienceYears, age } =
    req.body;

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
    await profile.save();

    res.json({
      success: true,
      message: "Teacher updated",
      teacher: {
        _id: teacher._id,
        name: teacher.name,
        username: teacher.username,
        email: teacher.email,
        qualification: profile.qualification,
        specialization: profile.specialization,
        experienceYears: profile.experienceYears,
        age: profile.age,
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

// @route   GET /api/students/me
// @access  Child only (their own profile)
export const getMyProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ studentUser: req.user.id })
      .populate("assignedTeacher", "name username")
      .populate("parentUser", "name username");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
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

// @route   GET /api/students/emotion-checkin/today
// @access  Child only
// Returns today's emotion check-in for the logged-in child, if one exists
// yet (either side may have already submitted).
export const getMyTodayEmotionCheckin = async (req, res) => {
  try {
    const student = await Student.findOne({ studentUser: req.user.id });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const checkin = await EmotionCheckin.findOne({
      student: student._id,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    res.json({
      success: true,
      checkin: checkin || null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   POST /api/students/emotion-checkin
// @access  Child only
// Body: { emoji }
// The child's own self-report — independent of the teacher's observation.
// Finds or creates today's check-in and sets just the childEmoji side.
export const submitChildEmotionCheckin = async (req, res) => {
  const { emoji } = req.body;

  try {
    if (!emoji || !Object.keys(EMOJI_SCORES).includes(emoji)) {
      return res.status(400).json({
        success: false,
        message: "A valid emoji is required",
      });
    }

    const student = await Student.findOne({ studentUser: req.user.id });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    if (!student.assignedTeacher) {
      return res.status(400).json({
        success: false,
        message: "No shadow teacher is assigned yet",
      });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    let checkin = await EmotionCheckin.findOne({
      student: student._id,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    // Tag whichever check-in this touches with the context it was
    // submitted in — a same-day resubmission (e.g. child updates their
    // mood again in the evening) shifts the tag to "home" too, since
    // that's the more recent, more relevant context for the activity plan.
    const context = currentCheckinContext();

    if (checkin) {
      checkin.childEmoji = emoji;
      checkin.context = context;
      await checkin.save();
    } else {
      checkin = await EmotionCheckin.create({
        student: student._id,
        teacher: student.assignedTeacher,
        childEmoji: emoji,
        context,
      });
    }

    // FR-10: re-check alert thresholds now that the composite score may
    // have changed.
    await evaluateThresholds(student._id);

    res.json({
      success: true,
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

// @route   GET /api/students/activity-plan
// @access  Child only
// FR-09/FR-12: builds today's personalised, icon-based activity plan from
// the child's own composite emotion score (once either side has checked
// in) and today's logged symptoms. Deterministic rules engine — see
// utils/activityPlanEngine.js — rather than a trained model. Works
// whenever the child opens this page, school hours or not — the plan is
// always computed live from whatever's been logged today so far, there's
// no time gate anywhere in this flow.
export const getMyActivityPlan = async (req, res) => {
  try {
    const student = await Student.findOne({ studentUser: req.user.id });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [checkin, symptomLogs] = await Promise.all([
      EmotionCheckin.findOne({
        student: student._id,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      }),
      SymptomLog.find({
        student: student._id,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      }).select("symptoms"),
    ]);

    const score = checkin?.compositeScore ?? null;
    const symptoms = symptomLogs.flatMap((log) => log.symptoms);

    const plan = buildActivityPlan(score, symptoms);

    // Prefer the tag already saved on today's check-in (set the moment the
    // child submitted); fall back to "right now" if they haven't checked
    // in yet today but are still browsing the activity plan.
    const context = checkin?.context || currentCheckinContext();

    res.json({
      success: true,
      band: plan.band,
      context,
      cards: plan.cards,
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

    if (
      req.user.role === "child" &&
      student.studentUser?.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "This is not your profile",
      });
    }

    if (req.user.role === "principal" && student.branch !== req.user.branch) {
      return res.status(403).json({
        success: false,
        message: "This student is not in your branch",
      });
    }

    const [symptomLogs, emotionCheckins] = await Promise.all([
      SymptomLog.find({ student: studentId }).sort({ createdAt: -1 }),
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
      .populate("assignedTeacher", "name username")
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

    if (
      req.user.role === "child" &&
      student.studentUser?.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "This is not your profile",
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
      .populate("assignedTeacher", "name username")
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
// @access  Parent or Child
// Resolves "my linked student record" regardless of which side of the
// relationship is calling — the parent (via parentUser) or the child
// themself (via studentUser). Lets dashboard pages shared between the two
// roles fetch through one endpoint instead of branching on role.
export const getLinkedStudent = async (req, res) => {
  try {
    const filter =
      req.user.role === "child"
        ? { studentUser: req.user.id }
        : { parentUser: req.user.id };

    const student = await Student.findOne(filter)
      .populate("assignedTeacher", "name username")
      .populate("parentUser", "name username")
      .populate("studentUser", "name username");

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

// @route   GET /api/students/:studentId/symptom-trends?range=weekly|monthly|quarterly
// @access  Child (own only), Parent (own child only), Shadow Teacher
// (assigned only), Class Teacher (own branch only), Admin/Principal
// (any student).
// Returns a bucketed count of symptoms checked over time for the Reports
// chart. "weekly" = one bucket per day for the last 7 days. "monthly" =
// one bucket per week for the last ~5 weeks. "quarterly" = one bucket per
// month for the last ~3 months — client meeting 20 Feb 2026's "3-Month
// Final Conclusion Report".
export const getSymptomTrends = async (req, res) => {
  const { studentId } = req.params;
  const range = ["monthly", "quarterly"].includes(req.query.range)
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
      (req.user.role === "child" &&
        student.studentUser?.toString() !== req.user.id) ||
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

    const now = new Date();
    const bucketCount =
      range === "quarterly" ? 3 : range === "monthly" ? 5 : 7;
    // "quarterly" buckets by calendar month rather than a fixed day count,
    // so each bucket cleanly represents "this month / last month / the
    // month before" for the final conclusion report.
    const bucketSizeDays = range === "monthly" ? 7 : 1;

    const rangeStart = new Date(now);
    rangeStart.setHours(0, 0, 0, 0);
    if (range === "quarterly") {
      rangeStart.setDate(1);
      rangeStart.setMonth(rangeStart.getMonth() - (bucketCount - 1));
    } else {
      rangeStart.setDate(
        rangeStart.getDate() - bucketCount * bucketSizeDays + 1
      );
    }

    const logs = await SymptomLog.find({
      student: studentId,
      createdAt: { $gte: rangeStart },
    }).select("symptoms createdAt");

    const buckets =
      range === "quarterly"
        ? Array.from({ length: bucketCount }, (_, i) => {
            const bucketStart = new Date(rangeStart);
            bucketStart.setMonth(bucketStart.getMonth() + i);
            const bucketEnd = new Date(bucketStart);
            bucketEnd.setMonth(bucketEnd.getMonth() + 1);

            const label = bucketStart.toLocaleDateString("default", {
              month: "short",
              year: "numeric",
            });

            return { label, start: bucketStart, end: bucketEnd, count: 0 };
          })
        : Array.from({ length: bucketCount }, (_, i) => {
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

    for (const log of logs) {
      const bucket = buckets.find(
        (b) => log.createdAt >= b.start && log.createdAt < b.end
      );
      if (bucket) bucket.count += log.symptoms.length;
    }

    res.json({
      success: true,
      range,
      trend: buckets.map((b) => ({ label: b.label, count: b.count })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
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
    firstName,
    lastName,
    dateOfBirth,
    gender,
    grade,
    section,
    diagnosis,
    communicationLevel,
    additionalNotes,
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

    if (firstName !== undefined) {
      if (!firstName.trim()) {
        return res.status(400).json({
          success: false,
          message: "First name is required",
        });
      }
      student.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      if (!lastName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Last name is required",
        });
      }
      student.lastName = lastName.trim();
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
      { path: "assignedTeacher", select: "name username" },
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
      { new: true }
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
  const { symptoms, additionalNotes, medications, medicationNotes } = req.body;

  try {
    if (!symptoms || symptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one symptom",
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
  const { symptoms, additionalNotes, medications, medicationNotes } = req.body;

  try {
    if (!symptoms || symptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one symptom",
      });
    }

    const log = await SymptomLog.findByIdAndUpdate(
      logId,
      {
        symptoms,
        additionalNotes,
        medications: (medications || []).filter((m) => m?.name?.trim()),
        medicationNotes,
      },
      { new: true, runValidators: true }
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
  const { childEmoji, teacherEmoji } = req.body;

  try {
    if (!childEmoji || !teacherEmoji) {
      return res.status(400).json({
        success: false,
        message: "childEmoji and teacherEmoji are both required",
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
  const { childEmoji, teacherEmoji } = req.body;

  try {
    if (!childEmoji || !teacherEmoji) {
      return res.status(400).json({
        success: false,
        message: "childEmoji and teacherEmoji are both required",
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
