import express from "express";
import {
  registerStudent,
  getAllStudents,
  getAvailableTeachers,
  getBranches,
  getMyChild,
  getLinkedStudent,
  getStudentHistory,
  getBreakActivities,
  getStudentProfile,
  getSymptomTrends,
  getStudentReportPdf,
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
import {
  createTeacherAssignmentRequest,
  listMyTeacherAssignmentRequests,
} from "../controllers/teacherAssignmentRequestController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
const router = express.Router();

// Branch list is readable by any authenticated role (used by the admission
// wizard, principal account creation, etc).
router.get("/branches", protect, getBranches);

// Parent fetching their child's profile, and the symptom/emotion history
// view — must come BEFORE the admin-only block below, otherwise they
// inherit the admin-only restriction.
// Note: there is no child login/dashboard — emotion check-ins are recorded
// by the shadow teacher on the child's behalf (see teacherRoutes.js).
router.get("/child", protect, authorizeRoles("parent"), getMyChild);
router.get("/linked", protect, authorizeRoles("parent"), getLinkedStudent);
router.get(
  "/:studentId/history",
  protect,
  authorizeRoles("admin", "principal", "parent", "shadow_teacher"),
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
  authorizeRoles("admin", "principal", "parent", "shadow_teacher"),
  getStudentProfile
);
router.get(
  "/:studentId/symptom-trends",
  protect,
  authorizeRoles(
    "parent",
    "shadow_teacher",
    "class_teacher",
    "admin",
    "principal"
  ),
  getSymptomTrends
);
// Server-generated PDF version of the printable report — same access list
// as /profile and /history since it's the same underlying data.
router.get(
  "/:studentId/report.pdf",
  protect,
  authorizeRoles("admin", "principal", "parent", "shadow_teacher"),
  getStudentReportPdf
);

// All routes below require a valid token AND admin role
router.use(protect);
router.use(authorizeRoles("admin"));
router.post("/", registerStudent);
router.get("/", getAllStudents);
router.get("/teachers", getAvailableTeachers);
router.patch("/teachers/:id", updateTeacherAccount);
router.post("/teachers/:id/request-assignment", createTeacherAssignmentRequest);
router.get("/teacher-requests/mine", listMyTeacherAssignmentRequests);
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