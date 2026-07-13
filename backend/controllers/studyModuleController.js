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

    // Modules: subject folder -> topic sub-groups -> teacher's files plus
    // the child/parent's own submissions for that same topic. Submissions
    // live alongside the module files they answer, rather than in their own
    // separate section, so a topic is the one place to see both what the
    // teacher assigned and what's been turned in for it. All 5 subject
    // folders are always returned (even empty) so the UI can show them as
    // persistent folders rather than only appearing once something's
    // uploaded.
    const withOwner = (r) => ({
      ...r.toObject(),
      isOwner: r.uploadedBy.toString() === req.user.id,
    });

    const modules = SUBJECTS.map((subject) => {
      const moduleResources = resources.filter(
        (r) => r.type === "module" && r.subject === subject
      );
      const submissionResources = resources.filter(
        (r) => r.type === "submission" && r.subject === subject
      );

      const topicOrder = [];
      const topicModuleMap = {};
      const topicSubmissionMap = {};

      moduleResources.forEach((r) => {
        const key = r.topic || "Untitled Topic";
        if (!topicModuleMap[key]) {
          topicModuleMap[key] = [];
          topicOrder.push(key);
        }
        topicModuleMap[key].push(r);
      });

      // A submission always targets an existing topic (the child submits
      // from within that topic's view), but fold in any topic that only
      // has submissions too, just in case — a topic should never silently
      // disappear because it has no module files yet.
      submissionResources.forEach((r) => {
        const key = r.topic || "Untitled Topic";
        if (!topicOrder.includes(key)) topicOrder.push(key);
        if (!topicSubmissionMap[key]) topicSubmissionMap[key] = [];
        topicSubmissionMap[key].push(r);
      });

      return {
        subject,
        topics: topicOrder.map((topic) => ({
          topic,
          files: (topicModuleMap[topic] || []).map(withOwner),
          submissions: (topicSubmissionMap[topic] || []).map(withOwner),
        })),
      };
    });

    // Past papers: subject folder -> flat file list. Same always-show-all-5
    // approach as modules.
    const pastPapers = SUBJECTS.map((subject) => ({
      subject,
      files: resources
        .filter((r) => r.type === "pastPaper" && r.subject === subject)
        .map(withOwner),
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
// @access  Shadow Teacher (module, pastPaper) or Child/Parent (submission) —
// doctor's recommendation uploads now go through the dedicated
// /api/doctor-documents endpoints.
// Body (multipart/form-data): studentId, type, subject, topic? (required
// for "module" and "submission" — a submission always targets the topic
// it's answering), file
export const uploadResource = async (req, res) => {
  const { studentId, type, subject, topic } = req.body;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file was uploaded",
      });
    }

    if (!["module", "pastPaper", "submission"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource type",
      });
    }

    // Modules/past papers are teacher-authored course material; submissions
    // are the child/parent handing their completed work back. Keep the two
    // directions separate even though they share one endpoint/route.
    const isTeacherType = type === "module" || type === "pastPaper";
    if (isTeacherType && req.user.role !== "shadow_teacher") {
      return res.status(403).json({
        success: false,
        message: "Only the shadow teacher can upload modules or past papers",
      });
    }
    if (type === "submission" && !["child", "parent"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only the child or parent can upload a submission",
      });
    }

    if (!SUBJECTS.includes(subject)) {
      return res.status(400).json({
        success: false,
        message: "A valid subject folder is required",
      });
    }

    if ((type === "module" || type === "submission") && !topic?.trim()) {
      return res.status(400).json({
        success: false,
        message: "A topic name is required for this upload",
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
      topic: type === "module" || type === "submission" ? topic.trim() : undefined,
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

// @route   PUT /api/study-modules/:id
// @access  Whoever uploaded the file (shadow teacher for modules/past
// papers, child or parent for their own submission) — same uploader-only
// rule as delete below.
// Body (multipart/form-data, all optional): subject, topic, file. Only the
// fields provided are changed; a new file (if any) replaces the old one on
// disk. The resource's "type" itself can't be changed.
export const editResource = async (req, res) => {
  const { id } = req.params;
  const { subject, topic } = req.body;

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
        message: "You can only edit files you uploaded",
      });
    }

    if (subject !== undefined) {
      if (!SUBJECTS.includes(subject)) {
        return res.status(400).json({
          success: false,
          message: "A valid subject folder is required",
        });
      }
      resource.subject = subject;
    }

    if (topic !== undefined) {
      const needsTopic = resource.type === "module" || resource.type === "submission";
      if (needsTopic && !topic.trim()) {
        return res.status(400).json({
          success: false,
          message: "A topic name is required for this file",
        });
      }
      resource.topic = needsTopic ? topic.trim() : undefined;
    }

    if (req.file) {
      const oldPath = resource.filePath;
      resource.fileName = req.file.originalname;
      resource.filePath = req.file.path;
      fs.unlink(oldPath, () => {
        // Best-effort cleanup of the replaced file — if it's already gone,
        // that's fine.
      });
    }

    await resource.save();

    res.json({
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
// @access  Whoever uploaded the file (shadow teacher for modules/past
// papers, child or parent for their own submission)
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
