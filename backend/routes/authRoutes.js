import express from "express";
import {
  login,
  getMe,
  getPinStatus,
  setPin,
  verifyPin,
  forgotUsername,
  forgotPassword,
  resetPassword,
  changePassword,
  changeUsername,
  changeEmail,
  viewAsChild,
} from "../controllers/authController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", login);
router.get("/me", protect, getMe);
router.get("/pin-status", protect, getPinStatus);
router.post("/set-pin", protect, setPin);
router.post("/verify-pin", protect, verifyPin);

// Logged-out recovery flow
router.post("/forgot-username", forgotUsername);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Logged-in "change my own username/password" — any role, admin included
router.post("/change-password", protect, changePassword);
router.post("/change-username", protect, changeUsername);

// Logged-in "add/change my recovery email" — staff roles only (see
// changeEmail for why parent/child are excluded)
router.post("/change-email", protect, changeEmail);

// Parent-initiated switch into their child's dashboard, no separate
// child login required.
router.post("/view-as-child", protect, authorizeRoles("parent"), viewAsChild);

export default router;
