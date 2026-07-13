import express from "express";
import {
  registerStudent,
  getAllStudents,
  getAvailableTeachers,
  getBranches,
  getMyProfile,
  getMyChild,
  getLinkedStudent,
  getMyTodayEmotionCheckin,
  submitChildEmotionCheckin,
  getMyActivityPlan,
  getStudentHistory,
  getBreakActivities,
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
  updateTeacherAccount,
  updateStudentProfile,
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
  "/linked",
  protect,
  authorizeRoles("parent", "child"),
  getLinkedStudent
);
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
// FR-09/FR-12: today's personalised activity plan for the child dashboard.
router.get(
  "/activity-plan",
  protect,
  authorizeRoles("child"),
  getMyActivityPlan
);
router.get(
  "/:studentId/history",
  protect,
  authorizeRoles("admin", "principal", "parent", "shadow_teacher", "child"),
  getStudentHistory
);
router.get(
  "/:studentId/break-activities",
  protect,
  authorizeRoles("admin", "principal", "parent", "shadow_teacher"),
  getBreakActivities
);
router.get(
  "/:studentId/profile",
  protect,
  authorizeRoles("admin", "principal", "parent", "shadow_teacher", "child"),
  getStudentProfile
);
router.get(
  "/:studentId/symptom-trends",
  protect,
  authorizeRoles(
    "child",
    "parent",
    "shadow_teacher",
    "class_teacher",
    "admin",
    "principal"
  ),
  getSymptomTrends
);

// All routes below require a valid token AND admin role
router.use(protect);
router.use(authorizeRoles("admin"));
router.post("/", registerStudent);
router.get("/", getAllStudents);
router.get("/teachers", getAvailableTeachers);
router.patch("/teachers/:id", updateTeacherAccount);
router.patch("/:studentId", updateStudentProfile);
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