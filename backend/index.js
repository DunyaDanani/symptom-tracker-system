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
import academicTermRoutes from "./routes/academicTermRoutes.js";
import { closeBrowser } from "./utils/pdfGenerator.js";
import mongoose from "mongoose";
import AcademicTerm from "./models/AcademicTerm.js";
import TeacherAssignmentRequest, {
  OPEN_REQUEST_STATUSES,
} from "./models/TeacherAssignmentRequest.js";
import Student from "./models/Student.js";

dotenv.config();

connectDB();

// Academic terms used to be unique per (year, term) school-wide; they're
// now unique per (branch, curriculum, year, term). syncIndexes drops the
// old index so a second branch can add its own "2026 Term 1".
mongoose.connection.once("open", async () => {
  AcademicTerm.syncIndexes().catch((err) =>
    console.error("Could not sync AcademicTerm indexes:", err.message)
  );

  // One-off, idempotent data upgrades for the teacher-request flow:
  //  - requests created before `isOpen` existed get it set from status;
  //  - students admitted before teacherHistory existed get their current
  //    teacher recorded, so the teacher keeps a branch on file if the
  //    student is later moved away from them.
  try {
    await TeacherAssignmentRequest.updateMany(
      { isOpen: { $exists: false } },
      [{ $set: { isOpen: { $in: ["$status", OPEN_REQUEST_STATUSES] } } }],
      // Mongoose 9 rejects update pipelines unless explicitly allowed.
      { updatePipeline: true }
    );
    // Older code allowed several open requests for one teacher (one per
    // admin). Keep the newest and cancel the rest so only one is live.
    const dupes = await TeacherAssignmentRequest.aggregate([
      { $match: { status: { $in: OPEN_REQUEST_STATUSES } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$teacher", ids: { $push: "$_id" } } },
      { $match: { "ids.1": { $exists: true } } },
    ]);
    const staleIds = dupes.flatMap((d) => d.ids.slice(1));
    if (staleIds.length) {
      await TeacherAssignmentRequest.updateMany(
        { _id: { $in: staleIds } },
        { $set: { status: "cancelled", isOpen: false, cancelledAt: new Date() } }
      );
      console.log(`Cancelled ${staleIds.length} duplicate teacher request(s).`);
    }
    await TeacherAssignmentRequest.syncIndexes();
    await Student.updateMany(
      { assignedTeacher: { $ne: null }, "teacherHistory.0": { $exists: false } },
      [
        {
          $set: {
            teacherHistory: [
              { teacher: "$assignedTeacher", assignedAt: "$createdAt", removedAt: null },
            ],
          },
        },
      ],
      { updatePipeline: true }
    );
  } catch (err) {
    // Most likely cause: two open requests for the same teacher already
    // exist, so the one-open-request index can't be built. Cancel one.
    console.error("Teacher-request data upgrade failed:", err.message);
  }
});

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
app.use("/api/academic-terms", academicTermRoutes);
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
