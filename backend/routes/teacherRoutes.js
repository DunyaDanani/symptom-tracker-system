import express from "express";
import {
  getMyStudents,
  logSymptoms,
  getSymptomHistory,
  submitEmotionCheckin,
  getEmotionHistory,
  getStudentToday,
  getSymptomOptions,
  getMyTeacherProfile,
  setStudentFlag,
  getBreakActivityOptions,
  logBreakActivity,
  getBreakActivityHistory,
} from "../controllers/teacherController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
// Client meeting 20 Feb 2026: symptom tracker access extended beyond
// Shadow Teachers to Class Teachers — both share this router, with
// branch-wide vs assigned-only access resolved per-request inside
// teacherController.js (see studentAccessFilter). Subject Teacher was
// left out — with many subject teachers per branch, often teaching
// across multiple classes/branches, that's a real many-to-many
// relationship this simple branch-scoped model can't represent honestly.
router.use(authorizeRoles("shadow_teacher", "class_teacher"));

// Defensive guard: a class teacher account created without a branch
// shouldn't silently fall through to an unfiltered/global view.
router.use((req, res, next) => {
  if (req.user.role !== "shadow_teacher" && !req.user.branch) {
    return res.status(400).json({
      success: false,
      message: "This teacher account has no branch assigned. Contact an admin.",
    });
  }
  next();
});

router.get("/profile", getMyTeacherProfile);
router.get("/students", getMyStudents);
router.get("/symptom-options", getSymptomOptions);
router.get("/students/:studentId/today", getStudentToday);
router.get("/students/:studentId/symptoms", getSymptomHistory);
router.get("/students/:studentId/emotion-history", getEmotionHistory);
router.post("/symptoms", logSymptoms);
router.post("/emotion-checkin", submitEmotionCheckin);
router.patch("/students/:studentId/flag", setStudentFlag);
router.get("/break-activity-options", getBreakActivityOptions);
router.post("/break-activities", logBreakActivity);
router.get(
  "/students/:studentId/break-activities",
  getBreakActivityHistory
);

export default router;