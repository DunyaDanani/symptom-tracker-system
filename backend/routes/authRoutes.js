import express from "express";
import {
  login,
  getPinStatus,
  setPin,
  verifyPin,
  forgotUsername,
  forgotPassword,
  resetPassword,
  changePassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", login);
router.get("/pin-status", protect, getPinStatus);
router.post("/set-pin", protect, setPin);
router.post("/verify-pin", protect, verifyPin);

// Logged-out recovery flow
router.post("/forgot-username", forgotUsername);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Logged-in "change my own password" — any role, admin included
router.post("/change-password", protect, changePassword);

export default router;
