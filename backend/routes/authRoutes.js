import express from "express";
import {
  login,
  getPinStatus,
  setPin,
  verifyPin,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", login);
router.get("/pin-status", protect, getPinStatus);
router.post("/set-pin", protect, setPin);
router.post("/verify-pin", protect, verifyPin);

export default router;
