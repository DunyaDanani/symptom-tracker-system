import fs from "fs";
import Student, { BRANCHES } from "../models/Student.js";
import DoctorDocument from "../models/DoctorDocument.js";

// Parent (own child), Shadow Teacher (assigned student), Principal (any
// student in their own branch), Admin (any student) can view a student's
// doctor documents. Only Parent can upload or delete.
const canView = (student, user) => {
  if (user.role === "admin") return true;
  if (user.role === "principal") return student.branch === user.branch;
  if (user.role === "parent") return student.parentUser?.toString() === user.id;
  if (user.role === "shadow_teacher")
    return student.assignedTeacher?.toString() === user.id;
  return false;
};

// @route   POST /api/doctor-documents
// @access  Parent only
// Body (multipart/form-data): studentId, file (image or PDF)
export const uploadDoctorDocument = async (req, res) => {
  const { studentId } = req.body;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file was uploaded",
      });
    }

    const isPdf = req.file.mimetype === "application/pdf";
    const isImage = req.file.mimetype.startsWith("image/");

    if (!isPdf && !isImage) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        success: false,
        message: "Only photo (JPG/PNG) or PDF files are accepted",
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (student.parentUser?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "This student is not linked to your account",
      });
    }

    const document = await DoctorDocument.create({
      student: studentId,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileType: isPdf ? "pdf" : "photo",
      uploadedBy: req.user.id,
      uploadedByRole: req.user.role,
    });

    res.status(201).json({
      success: true,
      message: "Document uploaded — pending admin review",
      document,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/doctor-documents/:id/file
// @access  Parent (own child), Shadow Teacher (assigned), Admin (any)
// Streams the actual file. Replaces the old unauthenticated static
// /uploads mount — this re-runs the exact same ownership check as the
// metadata endpoint above before ever touching the file on disk, so a
// guessed/leaked URL alone can't pull someone else's medical document.
export const downloadDoctorDocument = async (req, res) => {
  const { id } = req.params;

  try {
    const document = await DoctorDocument.findById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    const student = await Student.findById(document.student);
    if (!student || !canView(student, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this document",
      });
    }

    res.download(document.filePath, document.fileName, (err) => {
      if (err && !res.headersSent) {
        console.error(err);
        res.status(404).json({
          success: false,
          message: "File could not be found on the server",
        });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/doctor-documents/student/:studentId
// @access  Parent (own child), Shadow Teacher (assigned), Admin (any)
// Powers the "doc history" view.
export const getStudentDoctorDocuments = async (req, res) => {
  const { studentId } = req.params;

  try {
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (!canView(student, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this student's documents",
      });
    }

    const documents = await DoctorDocument.find({ student: studentId })
      .populate("reviewedBy", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      documents,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/doctor-documents?status=pending|all&branch=<branch>
// @access  Admin only
// Review queue across all students, default to just what still needs
// review. Optional ?branch= narrows the queue to one branch — admin
// oversees all 7 branches, so this keeps the list usable.
export const getAllDoctorDocuments = async (req, res) => {
  const status = req.query.status === "all" ? "all" : "pending";
  const { branch } = req.query;

  try {
    const filter = status === "pending" ? { status: "pending" } : {};

    if (branch) {
      if (!BRANCHES.includes(branch)) {
        return res.status(400).json({
          success: false,
          message: "Invalid branch",
        });
      }
      const branchStudentIds = await Student.find({ branch }).distinct("_id");
      filter.student = { $in: branchStudentIds };
    }

    const documents = await DoctorDocument.find(filter)
      .populate("student", "firstName lastName grade section branch")
      .populate("reviewedBy", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      documents,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   PATCH /api/doctor-documents/:id/review
// @access  Admin only
// Body: { status: "approved" | "rejected", reviewNote? }
export const reviewDoctorDocument = async (req, res) => {
  const { id } = req.params;
  const { status, reviewNote } = req.body;

  try {
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'approved' or 'rejected'",
      });
    }

    const document = await DoctorDocument.findByIdAndUpdate(
      id,
      {
        status,
        reviewNote: reviewNote || "",
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
      },
      { new: true }
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    res.json({
      success: true,
      message: `Document ${status}`,
      document,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   DELETE /api/doctor-documents/:id
// @access  Parent only (whoever uploaded it)
export const deleteDoctorDocument = async (req, res) => {
  const { id } = req.params;

  try {
    const document = await DoctorDocument.findById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    if (document.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only delete documents you uploaded",
      });
    }

    fs.unlink(document.filePath, () => {
      // Best-effort cleanup — if the file's already gone, that's fine.
    });

    await document.deleteOne();

    res.json({
      success: true,
      message: "Document deleted",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
