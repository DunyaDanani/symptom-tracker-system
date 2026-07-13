import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import teacherRoutes from "./routes/teacherRoutes.js";
import principalRoutes from "./routes/principalRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import studyModuleRoutes from "./routes/studyModuleRoutes.js";
import doctorDocumentRoutes from "./routes/doctorDocumentRoutes.js";
import noticeRoutes from "./routes/noticeRoutes.js";
import { closeBrowser } from "./utils/pdfGenerator.js";

dotenv.config();

connectDB();

const app = express();

app.use(cors());

app.use(express.json());

// NOTE: uploaded files (doctor documents, study module resources, message
// attachments) are intentionally NOT served via a static /uploads mount —
// that would let anyone with a file's URL download it, logged in or not.
// Each file type instead has its own authenticated download route
// (GET /api/doctor-documents/:id/file, /api/study-modules/:id/file,
// /api/messages/:id/attachment) that re-runs the same ownership check as
// its metadata endpoint before streaming the file.

app.get("/", (req, res) => {
  res.send("🚀 Backend is running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/principal", principalRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/study-modules", studyModuleRoutes);
app.use("/api/doctor-documents", doctorDocumentRoutes);
app.use("/api/notices", noticeRoutes);
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

// Make sure the headless Chrome instance used for PDF report generation
// doesn't linger as an orphaned process after the server stops.
const shutdown = async () => {
  await closeBrowser();
  server.close(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
