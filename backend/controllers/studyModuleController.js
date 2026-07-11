import fs from "fs";
import Student from "../models/Student.js";
import StudyResource, { SUBJECTS } from "../models/StudyResource.js";

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

    // Modules: subject folder -> topic sub-groups -> files. All 5 subject
    // folders are always returned (even empty) so the UI can show them as
    // persistent folders rather than only appearing once something's
    // uploaded.
    const modules = SUBJECTS.map((subject) => {
      const subjectResources = resources.filter(
        (r) => r.type === "module" && r.subject === subject
      );

      const topicOrder = [];
      const topicMap = {};
      subjectResources.forEach((r) => {
        const key = r.topic || "Untitled Topic";
        if (!topicMap[key]) {
          topicMap[key] = [];
          topicOrder.push(key);
        }
        topicMap[key].push(r);
      });

      return {
        subject,
        topics: topicOrder.map((topic) => ({ topic, files: topicMap[topic] })),
      };
    });

    // Past papers: subject folder -> flat file list. Same always-show-all-5
    // approach as modules.
    const pastPapers = SUBJECTS.map((subject) => ({
      subject,
      files: resources.filter(
        (r) => r.type === "pastPaper" && r.subject === subject
      ),
    }));

    res.json({
      success: true,
      modules,
      pastPapers,
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
// @access  Shadow Teacher only (module, pastPaper) — doctor's recommendation
// uploads now go through the dedicated /api/doctor-documents endpoints.
// Body (multipart/form-data): studentId, type, subject, topic? (required
// for "module"), file
export const uploadResource = async (req, res) => {
  const { studentId, type, subject, topic } = req.body;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file was uploaded",
      });
    }

    if (!["module", "pastPaper"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource type",
      });
    }

    if (!SUBJECTS.includes(subject)) {
      return res.status(400).json({
        success: false,
        message: "A valid subject folder is required",
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
      subject,
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

// @route   GET /api/study-modules/:id/file
// @access  Child (own profile), Parent (own child), Shadow Teacher (assigned)
// Streams the actual file. Replaces the old unauthenticated static
// /uploads mount — re-runs the same ownership check as the listing
// endpoint before ever touching the file on disk.
export const downloadResource = async (req, res) => {
  const { id } = req.params;

  try {
    const resource = await StudyResource.findById(id);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    const student = await Student.findById(resource.student);
    if (!student || !canAccessStudent(student, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this file",
      });
    }

    res.download(resource.filePath, resource.fileName, (err) => {
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

// @route   DELETE /api/study-modules/:id
// @access  Shadow Teacher (whoever uploaded the file)
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
