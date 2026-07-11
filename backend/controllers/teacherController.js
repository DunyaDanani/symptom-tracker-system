import Student from "../models/Student.js";
import User from "../models/User.js";
import TeacherProfile from "../models/TeacherProfile.js";
import SymptomLog, { SYMPTOM_OPTIONS } from "../models/SymptomLog.js";
import EmotionCheckin from "../models/EmotionCheckin.js";
import BreakActivityLog, {
  BREAK_ACTIVITY_OPTIONS,
} from "../models/BreakActivityLog.js";
import {
  evaluateThresholds,
  raiseManualFlagAlert,
  clearManualFlagAlert,
} from "../utils/alertEngine.js";

// Client meeting 20 Feb 2026: "Symptom tracker access should be extended
// to all subject teachers, including Class Teachers and Subject
// Teachers." Class Teacher shipped; Subject Teacher was cut — with many
// subject teachers per branch, often teaching across multiple
// classes/branches, that's a real many-to-many relationship this simple
// branch-scoped model can't represent honestly. A shadow teacher is 1:1
// with one assigned child, but a class teacher works with many students
// across a branch — so instead of the assignedTeacher relationship, they
// get branch-wide access to every student in their own branch. Every
// route below that used to check `assignedTeacher: req.user.id` now goes
// through these two helpers so both teacher roles share the same set of
// endpoints.
const studentAccessFilter = (user, studentId) =>
  user.role === "shadow_teacher"
    ? { _id: studentId, assignedTeacher: user.id }
    : { _id: studentId, branch: user.branch };

const studentListFilter = (user) =>
  user.role === "shadow_teacher"
    ? { assignedTeacher: user.id }
    : { branch: user.branch };

const accessDeniedMessage = (user) =>
  user.role === "shadow_teacher"
    ? "This student is not assigned to you"
    : "This student is not in your branch";

// @route   GET /api/teacher/profile
// @access  Shadow Teacher only
// Returns the logged-in teacher's own name + TeacherProfile details for the
// dashboard info card.
export const getMyTeacherProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("name username");
    const profile = await TeacherProfile.findOne({ user: req.user.id });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Teacher account not found",
      });
    }

    res.json({
      success: true,
      teacher: {
        name: user.name,
        username: user.username,
        qualification: profile?.qualification || "",
        specialization: profile?.specialization || "",
        experienceYears: profile?.experienceYears || 0,
        age: profile?.age || null,
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

// @route   GET /api/teacher/symptom-options
// @access  Shadow Teacher only
// Returns the fixed list of checkbox symptom options so the frontend
// never has to hard-code it separately from the model.
export const getSymptomOptions = (req, res) => {
  res.json({
    success: true,
    options: SYMPTOM_OPTIONS,
  });
};

// @route   GET /api/teacher/students
// @access  Shadow Teacher, Class Teacher
// Shadow teachers see their one assigned student; class/subject teachers
// see every student in their branch. Includes the extra profile fields
// (admission number, DOB, parent/guardian contact) so the student hub page
// can render a real profile view, not just the flag + quick-action tiles.
export const getMyStudents = async (req, res) => {
  try {
    const students = await Student.find(studentListFilter(req.user)).select(
      "firstName lastName grade section diagnosis communicationLevel flagged flagNote admissionNumber dateOfBirth gender parentFirstName parentRelationship parentPhone parentEmail homeCity"
    );

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

// @route   GET /api/teacher/students/:studentId/today
// @access  Shadow Teacher, Class Teacher
// Returns today's symptom log and emotion check-in (if any) for a student,
// so the teacher's session page knows what's already been submitted today.
export const getStudentToday = async (req, res) => {
  const { studentId } = req.params;

  try {
    const student = await Student.findOne(
      studentAccessFilter(req.user, studentId)
    );

    if (!student) {
      return res.status(403).json({
        success: false,
        message: accessDeniedMessage(req.user),
      });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [symptomLog, emotionCheckin] = await Promise.all([
      SymptomLog.findOne({
        student: studentId,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      }).sort({ createdAt: -1 }),
      EmotionCheckin.findOne({
        student: studentId,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      }).sort({ createdAt: -1 }),
    ]);

    res.json({
      success: true,
      symptomLog,
      emotionCheckin,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   POST /api/teacher/symptoms
// @access  Shadow Teacher, Class Teacher
// Body: { studentId, symptoms: string[], additionalNotes, medications?, medicationNotes? }
// medications: [{ name, dosage?, time? }] — client meeting 20 Feb 2026:
// medication details must be recorded within the symptom tracker.
export const logSymptoms = async (req, res) => {
  const { studentId, symptoms, additionalNotes, medications, medicationNotes } =
    req.body;

  try {
    if (!studentId || !symptoms || symptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one symptom",
      });
    }

    // Confirm this teacher actually has access to this student.
    const student = await Student.findOne(
      studentAccessFilter(req.user, studentId)
    );

    if (!student) {
      return res.status(403).json({
        success: false,
        message: accessDeniedMessage(req.user),
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
      message: "Symptom recorded",
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

// @route   GET /api/teacher/students/:studentId/symptoms
// @access  Shadow Teacher, Class Teacher
// Returns the full symptom history for a student, most recent first
export const getSymptomHistory = async (req, res) => {
  const { studentId } = req.params;

  try {
    const student = await Student.findOne(
      studentAccessFilter(req.user, studentId)
    );

    if (!student) {
      return res.status(403).json({
        success: false,
        message: accessDeniedMessage(req.user),
      });
    }

    const logs = await SymptomLog.find({ student: studentId }).sort({
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

// @route   POST /api/teacher/emotion-checkin
// @access  Shadow Teacher, Class Teacher
// Body: { studentId, teacherEmoji }
// The child submits their own emoji independently (see
// studentController.submitChildEmotionCheckin). This just records the
// teacher's side for today, filling in an existing same-day entry if the
// child already checked in, or creating a new one otherwise.
export const submitEmotionCheckin = async (req, res) => {
  const { studentId, teacherEmoji } = req.body;

  try {
    if (!studentId || !teacherEmoji) {
      return res.status(400).json({
        success: false,
        message: "studentId and teacherEmoji are required",
      });
    }

    const student = await Student.findOne(
      studentAccessFilter(req.user, studentId)
    );

    if (!student) {
      return res.status(403).json({
        success: false,
        message: accessDeniedMessage(req.user),
      });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    let checkin = await EmotionCheckin.findOne({
      student: studentId,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    if (checkin) {
      checkin.teacherEmoji = teacherEmoji;
      checkin.teacher = req.user.id;
      await checkin.save();
    } else {
      checkin = await EmotionCheckin.create({
        student: studentId,
        teacher: req.user.id,
        teacherEmoji,
      });
    }

    // FR-10: re-check alert thresholds now that the composite score may
    // have changed.
    await evaluateThresholds(studentId);

    res.status(201).json({
      success: true,
      message: "Emotion check-in recorded",
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

// @route   GET /api/teacher/students/:studentId/emotion-history
// @access  Shadow Teacher, Class Teacher
// Returns the full emotion check-in history for a student, most recent first
export const getEmotionHistory = async (req, res) => {
  const { studentId } = req.params;

  try {
    const student = await Student.findOne(
      studentAccessFilter(req.user, studentId)
    );

    if (!student) {
      return res.status(403).json({
        success: false,
        message: accessDeniedMessage(req.user),
      });
    }

    const checkins = await EmotionCheckin.find({ student: studentId }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      checkins,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/teacher/break-activity-options
// @access  Shadow Teacher only
// Fixed checkbox list for the break-time activity log, mirroring
// getSymptomOptions above.
export const getBreakActivityOptions = (req, res) => {
  res.json({
    success: true,
    options: BREAK_ACTIVITY_OPTIONS,
  });
};

// @route   POST /api/teacher/break-activities
// @access  Shadow Teacher, Class Teacher
// Body: { studentId, activities: string[], notes }
// Client meeting 20 Feb 2026: lets parents see what their child did during
// break time within the 6-hour school day.
export const logBreakActivity = async (req, res) => {
  const { studentId, activities, notes } = req.body;

  try {
    if (!studentId || !activities || activities.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one activity",
      });
    }

    const student = await Student.findOne(
      studentAccessFilter(req.user, studentId)
    );

    if (!student) {
      return res.status(403).json({
        success: false,
        message: accessDeniedMessage(req.user),
      });
    }

    const log = await BreakActivityLog.create({
      student: studentId,
      teacher: req.user.id,
      activities,
      notes,
    });

    res.status(201).json({
      success: true,
      message: "Break activity recorded",
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

// @route   GET /api/teacher/students/:studentId/break-activities
// @access  Shadow Teacher, Class Teacher
export const getBreakActivityHistory = async (req, res) => {
  const { studentId } = req.params;

  try {
    const student = await Student.findOne(
      studentAccessFilter(req.user, studentId)
    );

    if (!student) {
      return res.status(403).json({
        success: false,
        message: accessDeniedMessage(req.user),
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

// @route   PATCH /api/teacher/students/:studentId/flag
// @access  Shadow Teacher, Class Teacher (within access)
// Body: { flagged: boolean, flagNote?: string }
// Manual "needs attention" flag surfaced on the principal's dashboard.
export const setStudentFlag = async (req, res) => {
  const { studentId } = req.params;
  const { flagged, flagNote } = req.body;

  try {
    const student = await Student.findOneAndUpdate(
      studentAccessFilter(req.user, studentId),
      { flagged: Boolean(flagged), flagNote: flagNote || "" },
      { new: true }
    );

    if (!student) {
      return res.status(403).json({
        success: false,
        message: accessDeniedMessage(req.user),
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