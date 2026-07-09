import express from "express";
import {
  registerStudent,
  getAllStudents,
  getAvailableTeachers,
  getBranches,
  getMyProfile,
  getMyChild,
  getMyTodayEmotionCheckin,
  submitChildEmotionCheckin,
  getStudentHistory,
  getStudentProfile,
  getSymptomTrends,
  adminSetStudentFlag,
  getAdminSymptomOptions,
  adminCreateSymptomLog,
  adminUpdateSymptomLog,
  adminDeleteSymptomLog,
  adminCreateEmotionCheckin,
  adminUpdateEmotionCheckin,
  adminDeleteEmotionCheckin,
} from "../controllers/studentController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
const router = express.Router();

// Branch list is readable by any authenticated role (used by the admission
// wizard, principal account creation, etc).
router.get("/branches", protect, getBranches);

// Child fetching their own profile, parent fetching their child's profile,
// and the symptom/emotion history view — must come BEFORE the admin-only
// block below, otherwise they inherit the admin-only restriction.
router.get("/me", protect, authorizeRoles("child"), getMyProfile);
router.get("/child", protect, authorizeRoles("parent"), getMyChild);
router.get(
  "/emotion-checkin/today",
  protect,
  authorizeRoles("child"),
  getMyTodayEmotionCheckin
);



router.post(
  "/emotion-checkin",
  protect,
  authorizeRoles("child"),
  submitChildEmotionCheckin
);
router.get(
  "/:studentId/history",
  protect,
  authorizeRoles("admin", "principal", "parent", "shadow_teacher"),
  getStudentHistory
);
router.get(
  "/:studentId/profile",
  protect,
  authorizeRoles("admin", "principal", "parent", "shadow_teacher"),
  getStudentProfile
);
router.get(
  "/:studentId/symptom-trends",
  protect,
  authorizeRoles("child", "parent", "shadow_teacher", "admin", "principal"),
  getSymptomTrends
);

// All routes below require a valid token AND admin role
router.use(protect);
router.use(authorizeRoles("admin"));
router.post("/", registerStudent);
router.get("/", getAllStudents);
router.get("/teachers", getAvailableTeachers);
router.patch("/:studentId/flag", adminSetStudentFlag);

// Admin add/edit/delete access to symptom logs and emotion check-ins —
// an oversight/correction tool on top of what teachers can already log.
router.get("/symptom-options", getAdminSymptomOptions);
router.post("/:studentId/symptoms", adminCreateSymptomLog);
router.put("/symptoms/:logId", adminUpdateSymptomLog);
router.delete("/symptoms/:logId", adminDeleteSymptomLog);
router.post("/:studentId/emotion-checkin", adminCreateEmotionCheckin);
router.put("/emotion-checkin/:checkinId", adminUpdateEmotionCheckin);
router.delete("/emotion-checkin/:checkinId", adminDeleteEmotionCheckin);

export default router;