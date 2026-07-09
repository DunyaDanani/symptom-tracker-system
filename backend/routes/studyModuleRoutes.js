import express from "express";
import multer from "multer";
import path from "path";
import {
  getResources,
  uploadResource,
  deleteResource,
} from "../controllers/studyModuleController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.use(protect);

router.get(
  "/student/:studentId",
  authorizeRoles("shadow_teacher", "child", "parent"),
  getResources
);
router.post(
  "/",
  authorizeRoles("shadow_teacher", "parent"),
  upload.single("file"),
  uploadResource
);
router.delete("/:id", authorizeRoles("shadow_teacher", "parent"), deleteResource);

export default router;
