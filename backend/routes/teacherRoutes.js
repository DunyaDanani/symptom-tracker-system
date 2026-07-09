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
} from "../controllers/teacherController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("shadow_teacher"));

router.get("/profile", getMyTeacherProfile);
router.get("/students", getMyStudents);
router.get("/symptom-options", getSymptomOptions);
router.get("/students/:studentId/today", getStudentToday);
router.get("/students/:studentId/symptoms", getSymptomHistory);
router.get("/students/:studentId/emotion-history", getEmotionHistory);
router.post("/symptoms", logSymptoms);
router.post("/emotion-checkin", submitEmotionCheckin);
router.patch("/students/:studentId/flag", setStudentFlag);

export default router;