import express from "express";
import {
  createNotice,
  getNotices,
  deleteNotice,
} from "../controllers/noticeController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Every authenticated role reads the same feed.
router.get("/", protect, getNotices);

// Only Admin and Principal can post or remove notices.
router.post("/", protect, authorizeRoles("admin", "principal"), createNotice);
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "principal"),
  deleteNotice
);

export default router;
