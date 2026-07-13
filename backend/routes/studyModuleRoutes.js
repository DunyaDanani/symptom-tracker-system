import express from "express";
import multer from "multer";
import path from "path";
import {
  getResources,
  uploadResource,
  editResource,
  deleteResource,
  downloadResource,
} from "../controllers/studyModuleController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { documentFileFilter, runUpload } from "../utils/uploadFileFilter.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: documentFileFilter,
});

router.use(protect);

router.get(
  "/student/:studentId",
  authorizeRoles("shadow_teacher", "child", "parent"),
  getResources
);
router.get(
  "/:id/file",
  authorizeRoles("shadow_teacher", "child", "parent"),
  downloadResource
);
router.post(
  "/",
  authorizeRoles("shadow_teacher", "child", "parent"),
  runUpload(upload.single("file")),
  uploadResource
);
// File is optional on edit (metadata-only edits don't include one) — same
// multer instance handles that fine, req.file just stays undefined.
router.put(
  "/:id",
  authorizeRoles("shadow_teacher", "child", "parent"),
  runUpload(upload.single("file")),
  editResource
);
router.delete(
  "/:id",
  authorizeRoles("shadow_teacher", "child", "parent"),
  deleteResource
);

export default router;
