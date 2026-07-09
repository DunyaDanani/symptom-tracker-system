import express from "express";
import {
  createPrincipal,
  getPrincipals,
} from "../controllers/staffController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("admin"));

router.post("/principals", createPrincipal);
router.get("/principals", getPrincipals);

export default router;
