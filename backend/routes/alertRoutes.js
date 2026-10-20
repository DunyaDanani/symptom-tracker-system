import express from "express";
import { getMyAlerts } from "../controllers/staffController.js";
import { protect } from "../middleware/authMiddleware.js";

// Role-scoped alerts for the header bell (every role). Admin-only alert
// management (list all, dismiss) stays under /api/staff/alerts.
const router = express.Router();

router.get("/mine", protect, getMyAlerts);

export default router;
