import express from "express";
import {
  getStats,
  getAttention,
  getRoster,
} from "../controllers/principalController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("principal"));

// Defensive guard: a principal account created before branches existed
// (or missing one for any other reason) shouldn't silently see an
// unfiltered/global view.
router.use((req, res, next) => {
  if (!req.user.branch) {
    return res.status(400).json({
      success: false,
      message: "This principal account has no branch assigned. Contact an admin.",
    });
  }
  next();
});

router.get("/stats", getStats);
router.get("/attention", getAttention);
router.get("/students", getRoster);

export default router;
