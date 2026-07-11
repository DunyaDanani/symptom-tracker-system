import express from "express";
import {
  createPrincipal,
  getPrincipals,
  updatePrincipal,
  getAlerts,
  getAlertUnreadCount,
  acknowledgeAlert,
  getAdminStats,
} from "../controllers/staffController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("admin"));

router.get("/stats", getAdminStats);

router.post("/principals", createPrincipal);
router.get("/principals", getPrincipals);
router.patch("/principals/:id", updatePrincipal);

router.get("/alerts", getAlerts);
router.get("/alerts/unread-count", getAlertUnreadCount);
router.patch("/alerts/:id/acknowledge", acknowledgeAlert);

export default router;
