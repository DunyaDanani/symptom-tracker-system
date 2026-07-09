import express from "express";
import multer from "multer";
import path from "path";
import {
  getCategories,
  getRecipients,
  sendMessage,
  getInbox,
  getSentMessages,
  getUnreadCount,
} from "../controllers/messageController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.use(protect);

router.get("/categories", getCategories);
router.get("/recipients", getRecipients);
router.get("/inbox", getInbox);
router.get("/sent", getSentMessages);
router.get("/unread-count", getUnreadCount);
router.post("/", upload.single("attachment"), sendMessage);

export default router;
