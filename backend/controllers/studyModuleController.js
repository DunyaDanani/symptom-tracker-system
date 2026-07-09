import fs from "fs";
import Student from "../models/Student.js";
import StudyResource from "../models/StudyResource.js";

// Shared ownership check — makes sure the requesting user is actually
// allowed to touch this student's study resources.
const canAccessStudent = (student, user) => {
  if (user.role === "child") {
    return student.studentUser?.toString() === user.id;
  }
  if (user.role === "parent") {
    return student.parentUser?.toString() === user.id;
  }
  if (user.role === "shadow_teacher") {
    return student.assignedTeacher?.toString() === user.id;
  }
  return false;
};

// @route   GET /api/study-modules/student/:studentId
// @access  Child (own profile), Parent (own child), Shadow Teacher (assigned)
export const getResources = async (req, res) => {
  const { studentId } = req.params;

  try {
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (!canAccessStudent(student, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this student's study modules",
      });
    }

    const resources = await StudyResource.find({ student: studentId }).sort({
      createdAt: -1,
    });

    const pastPapers = resources.filter((r) => r.type === "pastPaper");
    const doctorNotes = resources.filter((r) => r.type === "doctorNote");

    // Group module files by topic, keeping most-recently-uploaded topics first.
    const topicOrder = [];
    const topicMap = {};
    resources
      .filter((r) => r.type === "module")
      .forEach((r) => {
        const key = r.topic || "Untitled Topic";
        if (!topicMap[key]) {
          topicMap[key] = [];
          topicOrder.push(key);
        }
        topicMap[key].push(r);
      });
    const modules = topicOrder.map((topic) => ({
      topic,
      files: topicMap[topic],
    }));

    res.json({
      success: true,
      modules,
      pastPapers,
      doctorNotes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   POST /api/study-modules
// @access  Shadow Teacher (module, pastPaper), Parent (doctorNote)
// Body (multipart/form-data): studentId, type, topic? (required for "module"), file
export const uploadResource = async (req, res) => {
  const { studentId, type, topic } = req.body;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file was uploaded",
      });
    }

    if (!["module", "pastPaper", "doctorNote"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource type",
      });
    }

    if (req.user.role === "shadow_teacher" && !["module", "pastPaper"].includes(type)) {
      return res.status(403).json({
        success: false,
        message: "Teachers can only upload modules or past papers",
      });
    }

    if (req.user.role === "parent" && type !== "doctorNote") {
      return res.status(403).json({
        success: false,
        message: "Parents can only upload the doctor's recommendation note",
      });
    }

    if (type === "module" && !topic?.trim()) {
      return res.status(400).json({
        success: false,
        message: "A topic name is required for module uploads",
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (!canAccessStudent(student, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this student",
      });
    }

    const resource = await StudyResource.create({
      student: studentId,
      type,
      topic: type === "module" ? topic.trim() : undefined,
      fileName: req.file.originalname,
      filePath: req.file.path,
      uploadedBy: req.user.id,
      uploadedByRole: req.user.role,
    });

    res.status(201).json({
      success: true,
      resource,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   DELETE /api/study-modules/:id
// @access  Whoever uploaded the file (Shadow Teacher or Parent)
export const deleteResource = async (req, res) => {
  const { id } = req.params;

  try {
    const resource = await StudyResource.findById(id);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    if (resource.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only delete files you uploaded",
      });
    }

    fs.unlink(resource.filePath, () => {
      // Best-effort cleanup — if the file's already gone, that's fine.
    });

    await resource.deleteOne();

    res.json({
      success: true,
      message: "File deleted",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
