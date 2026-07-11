import express from "express";
import multer from "multer";
import path from "path";
import {
  uploadDoctorDocument,
  getStudentDoctorDocuments,
  getAllDoctorDocuments,
  reviewDoctorDocument,
  deleteDoctorDocument,
  downloadDoctorDocument,
} from "../controllers/doctorDocumentController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

router.use(protect);

// Admin review queue
router.get("/", authorizeRoles("admin"), getAllDoctorDocuments);
router.patch("/:id/review", authorizeRoles("admin"), reviewDoctorDocument);

router.get(
  "/student/:studentId",
  authorizeRoles("parent", "shadow_teacher", "admin", "principal"),
  getStudentDoctorDocuments
);
router.get(
  "/:id/file",
  authorizeRoles("parent", "shadow_teacher", "admin", "principal"),
  downloadDoctorDocument
);
router.post(
  "/",
  authorizeRoles("parent"),
  upload.single("file"),
  uploadDoctorDocument
);
router.delete("/:id", authorizeRoles("parent"), deleteDoctorDocument);

export default router;
