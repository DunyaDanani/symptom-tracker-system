import express from "express";
import {
  listAcademicTerms,
  createAcademicTerm,
  updateAcademicTerm,
  deleteAcademicTerm,
} from "../controllers/academicTermController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Readable by any authenticated role — symptom logs, emotion check-ins,
// module uploads, and report pickers all need the calendar for their
// Academic Year / Term dropdowns.
router.get("/", protect, listAcademicTerms);

// Only an admin manages the calendar itself.
router.post("/", protect, authorizeRoles("admin"), createAcademicTerm);
router.put("/:id", protect, authorizeRoles("admin"), updateAcademicTerm);
router.delete("/:id", protect, authorizeRoles("admin"), deleteAcademicTerm);

export default router;
