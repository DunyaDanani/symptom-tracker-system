import Student from "../models/Student.js";
import User from "../models/User.js";
import TeacherProfile from "../models/TeacherProfile.js";
import SymptomLog, { SYMPTOM_OPTIONS } from "../models/SymptomLog.js";
import EmotionCheckin from "../models/EmotionCheckin.js";

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
// @access  Shadow Teacher only
// Returns all students currently assigned to the logged-in teacher
export const getMyStudents = async (req, res) => {
  try {
    const students = await Student.find({
      assignedTeacher: req.user.id,
    }).select(
      "firstName lastName grade section diagnosis communicationLevel flagged flagNote"
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
// @access  Shadow Teacher only
// Returns today's symptom log and emotion check-in (if any) for a student,
// so the teacher's session page knows what's already been submitted today.
export const getStudentToday = async (req, res) => {
  const { studentId } = req.params;

  try {
    const student = await Student.findOne({
      _id: studentId,
      assignedTeacher: req.user.id,
    });

    if (!student) {
      return res.status(403).json({
        success: false,
        message: "This student is not assigned to you",
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
// @access  Shadow Teacher only
// Body: { studentId, symptoms: string[], additionalNotes }
export const logSymptoms = async (req, res) => {
  const { studentId, symptoms, additionalNotes } = req.body;

  try {
    if (!studentId || !symptoms || symptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one symptom",
      });
    }

    // Confirm this student is actually assigned to this teacher
    const student = await Student.findOne({
      _id: studentId,
      assignedTeacher: req.user.id,
    });

    if (!student) {
      return res.status(403).json({
        success: false,
        message: "This student is not assigned to you",
      });
    }

    const log = await SymptomLog.create({
      student: studentId,
      teacher: req.user.id,
      symptoms,
      additionalNotes,
    });

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
// @access  Shadow Teacher only
// Returns the full symptom history for a student, most recent first
export const getSymptomHistory = async (req, res) => {
  const { studentId } = req.params;

  try {
    const student = await Student.findOne({
      _id: studentId,
      assignedTeacher: req.user.id,
    });

    if (!student) {
      return res.status(403).json({
        success: false,
        message: "This student is not assigned to you",
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
// @access  Shadow Teacher only
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

    const student = await Student.findOne({
      _id: studentId,
      assignedTeacher: req.user.id,
    });

    if (!student) {
      return res.status(403).json({
        success: false,
        message: "This student is not assigned to you",
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
// @access  Shadow Teacher only
// Returns the full emotion check-in history for a student, most recent first
export const getEmotionHistory = async (req, res) => {
  const { studentId } = req.params;

  try {
    const student = await Student.findOne({
      _id: studentId,
      assignedTeacher: req.user.id,
    });

    if (!student) {
      return res.status(403).json({
        success: false,
        message: "This student is not assigned to you",
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

// @route   PATCH /api/teacher/students/:studentId/flag
// @access  Shadow Teacher only (assigned students only)
// Body: { flagged: boolean, flagNote?: string }
// Manual "needs attention" flag surfaced on the principal's dashboard.
export const setStudentFlag = async (req, res) => {
  const { studentId } = req.params;
  const { flagged, flagNote } = req.body;

  try {
    const student = await Student.findOneAndUpdate(
      { _id: studentId, assignedTeacher: req.user.id },
      { flagged: Boolean(flagged), flagNote: flagNote || "" },
      { new: true }
    );

    if (!student) {
      return res.status(403).json({
        success: false,
        message: "This student is not assigned to you",
      });
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