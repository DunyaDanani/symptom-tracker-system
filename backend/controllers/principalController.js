import Student from "../models/Student.js";
import SymptomLog from "../models/SymptomLog.js";
import EmotionCheckin from "../models/EmotionCheckin.js";

// Shared helper: builds the "needs attention" list, scoped to a single
// branch, by combining the manual teacher/admin flag with two
// auto-detected conditions:
//   - 3+ symptom logs in the last 3 days
//   - average emotion compositeScore < 2.5 over the last 7 days
// Read-only — the principal never sets these, only views them.
const buildAttentionList = async (branch) => {
  const students = await Student.find({ branch }).populate(
    "assignedTeacher",
    "name username"
  );

  const now = new Date();
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(now.getDate() - 3);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

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
        createdAt: { $gte: threeDaysAgo },
      });
      if (recentSymptomCount >= 3) {
        reasons.push(
          `${recentSymptomCount} symptom logs in the last 3 days`
        );
      }

      const recentCheckins = await EmotionCheckin.find({
        student: student._id,
        createdAt: { $gte: sevenDaysAgo },
      }).select("compositeScore");

      if (recentCheckins.length > 0) {
        const avg =
          recentCheckins.reduce((sum, c) => sum + c.compositeScore, 0) /
          recentCheckins.length;
        if (avg < 2.5) {
          reasons.push(
            `Low average emotion score (${avg.toFixed(1)}) over the last 7 days`
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
