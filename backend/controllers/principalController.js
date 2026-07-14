import Student from "../models/Student.js";
import SymptomLog from "../models/SymptomLog.js";
import EmotionCheckin from "../models/EmotionCheckin.js";
import User from "../models/User.js";
import TeacherProfile from "../models/TeacherProfile.js";
import {
  SYMPTOM_FREQUENCY_WINDOW_DAYS,
  SYMPTOM_FREQUENCY_THRESHOLD,
  EMOTION_WINDOW_DAYS,
  EMOTION_SCORE_THRESHOLD,
} from "../utils/attentionThresholds.js";

// Shared helper: builds the "needs attention" list, scoped to a single
// branch, by combining the manual teacher/admin flag with two
// auto-detected conditions (same thresholds admin's Alert system uses —
// both import from utils/attentionThresholds.js so the two views can
// never silently drift apart):
//   - SYMPTOM_FREQUENCY_THRESHOLD+ symptom logs in the last
//     SYMPTOM_FREQUENCY_WINDOW_DAYS days
//   - average emotion compositeScore < EMOTION_SCORE_THRESHOLD over the
//     last EMOTION_WINDOW_DAYS days
// Read-only — the principal never sets these, only views them.
const buildAttentionList = async (branch) => {
  const students = await Student.find({ branch }).populate(
    "assignedTeacher",
    "name username"
  );

  const now = new Date();
  const symptomWindowStart = new Date(now);
  symptomWindowStart.setDate(now.getDate() - SYMPTOM_FREQUENCY_WINDOW_DAYS);
  const emotionWindowStart = new Date(now);
  emotionWindowStart.setDate(now.getDate() - EMOTION_WINDOW_DAYS);

  const results = await Promise.all(
    students.map(async (student) => {
      const reasons = [];

      if (student.flagged) {
        reasons.push(
          student.flagNote ? `Flagged: ${student.flagNote}` : "Manually flagged"
        );
      }

      const recentSymptomCount = await SymptomLog.countDocuments({
        student: student._id,
        createdAt: { $gte: symptomWindowStart },
      });
      if (recentSymptomCount >= SYMPTOM_FREQUENCY_THRESHOLD) {
        reasons.push(
          `${recentSymptomCount} symptom logs in the last ${SYMPTOM_FREQUENCY_WINDOW_DAYS} days`
        );
      }

      const recentCheckins = await EmotionCheckin.find({
        student: student._id,
        createdAt: { $gte: emotionWindowStart },
      }).select("compositeScore");

      if (recentCheckins.length > 0) {
        const avg =
          recentCheckins.reduce((sum, c) => sum + c.compositeScore, 0) /
          recentCheckins.length;
        if (avg < EMOTION_SCORE_THRESHOLD) {
          reasons.push(
            `Low average emotion score (${avg.toFixed(1)}) over the last ${EMOTION_WINDOW_DAYS} days`
          );
        }
      }

      if (reasons.length === 0) return null;

      return {
        _id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        grade: student.grade,
        section: student.section,
        assignedTeacher: student.assignedTeacher,
        flagged: student.flagged,
        reasons,
      };
    })
  );

  return results.filter(Boolean);
};

// @route   GET /api/principal/stats
// @access  Principal only — scoped to req.user.branch
export const getStats = async (req, res) => {
  const { branch } = req.user;

  try {
    const [totalStudents, distinctTeachers, attentionList] =
      await Promise.all([
        Student.countDocuments({ branch }),
        Student.distinct("assignedTeacher", {
          branch,
          assignedTeacher: { $ne: null },
        }),
        buildAttentionList(branch),
      ]);

    res.json({
      success: true,
      stats: {
        totalStudents,
        shadowTeacherCount: distinctTeachers.length,
        flaggedCount: attentionList.length,
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

// @route   GET /api/principal/attention
// @access  Principal only — scoped to req.user.branch
// Returns students needing attention, each with a list of reasons.
export const getAttention = async (req, res) => {
  try {
    const students = await buildAttentionList(req.user.branch);
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

// @route   GET /api/principal/students
// @access  Principal only — scoped to req.user.branch
// Full branch roster, read-only.
export const getRoster = async (req, res) => {
  try {
    const students = await Student.find({ branch: req.user.branch })
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

// @route   PATCH /api/principal/students/:studentId/exam-eligibility
// @access  Principal only — scoped to req.user.branch
// Body: { status: "eligible" | "not_eligible", note? }
// Typically set after the principal has reviewed the student's uploaded
// doctor's recommendation documents.
export const setExamEligibility = async (req, res) => {
  const { studentId } = req.params;
  const { status, note } = req.body;

  try {
    if (!["eligible", "not_eligible"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'eligible' or 'not_eligible'",
      });
    }

    const student = await Student.findOne({
      _id: studentId,
      branch: req.user.branch,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found in your branch",
      });
    }

    student.examEligibility = status;
    student.examEligibilityNote = note || "";
    student.examEligibilitySetBy = req.user.id;
    student.examEligibilitySetAt = new Date();
    await student.save();

    res.json({
      success: true,
      message:
        status === "eligible"
          ? "Student marked eligible for the exam"
          : "Student marked not eligible for the exam",
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

// @route   GET /api/principal/teachers/:teacherId
// @access  Principal only — scoped to req.user.branch
// Shadow teacher profile (qualification/specialization/experience) plus
// their assigned students within this principal's branch only. A teacher
// with students split across branches (they can be assigned to more than
// one child) never leaks the other branch's roster to this principal —
// only students in req.user.branch are ever returned or counted here.
export const getTeacherProfile = async (req, res) => {
  const { teacherId } = req.params;

  try {
    const hasStudentInBranch = await Student.exists({
      branch: req.user.branch,
      assignedTeacher: teacherId,
    });

    if (!hasStudentInBranch) {
      return res.status(403).json({
        success: false,
        message: "This teacher is not assigned to any student in your branch",
      });
    }

    const user = await User.findOne({
      _id: teacherId,
      role: "shadow_teacher",
    }).select("name username");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    const profile = await TeacherProfile.findOne({ user: teacherId });

    const students = await Student.find({
      branch: req.user.branch,
      assignedTeacher: teacherId,
    }).select("firstName lastName grade section");

    res.json({
      success: true,
      teacher: {
        _id: user._id,
        name: user.name,
        username: user.username,
        qualification: profile?.qualification || "",
        specialization: profile?.specialization || "",
        experienceYears: profile?.experienceYears || 0,
        age: profile?.age || null,
      },
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
