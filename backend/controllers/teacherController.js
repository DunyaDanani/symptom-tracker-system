import Student from "../models/Student.js";
import User from "../models/User.js";
import TeacherProfile from "../models/TeacherProfile.js";
import SymptomLog, { SYMPTOM_OPTIONS } from "../models/SymptomLog.js";
import EmotionCheckin, { EMOJI_SCORES } from "../models/EmotionCheckin.js";
import { resolveTermForDate } from "./academicTermController.js";
import BreakActivityLog, {
  BREAK_ACTIVITY_OPTIONS,
} from "../models/BreakActivityLog.js";
import {
  evaluateThresholds,
  raiseManualFlagAlert,
  clearManualFlagAlert,
} from "../utils/alertEngine.js";
import { buildAiActivityPlan } from "../utils/aiActivityPlanEngine.js";

// Shared by submitEmotionCheckin, getEmotionHistory's lazy backfill, and
// updateOwnEmotionCheckin's regenerate-on-edit — builds the AI activity
// plan for one check-in, persists it onto that exact record (see
// EmotionCheckin.activityPlan), and returns it. symptoms should be
// whatever was logged on the same calendar day as the check-in.
const generateAndSaveActivityPlan = async (checkin, student, symptoms) => {
  const plan = await buildAiActivityPlan({
    childEmoji: checkin.childEmoji,
    teacherEmoji: checkin.teacherEmoji,
    compositeScore: checkin.compositeScore,
    symptoms,
    diagnosis: student.diagnosis,
  });

  checkin.activityPlan = { ...plan, generatedAt: new Date() };
  await checkin.save();

  return checkin.activityPlan;
};

// Symptoms logged for a student on the same calendar day as `date`.
const symptomsLoggedOn = async (studentId, date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const logs = await SymptomLog.find({
    student: studentId,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  }).select("symptoms");

  return logs.flatMap((log) => log.symptoms);
};

// Client meeting 20 Feb 2026: "Symptom tracker access should be extended
// to all subject teachers, including Class Teachers and Subject
// Teachers." Class Teacher shipped; Subject Teacher was cut — with many
// subject teachers per branch, often teaching across multiple
// classes/branches, that's a real many-to-many relationship this simple
// branch-scoped model can't represent honestly. A shadow teacher is 1:1
// with one assigned child, but a class teacher works with many students
// across a branch — so instead of the assignedTeacher relationship, they
// get branch-wide access to every student in their own branch. Every
// route below that used to check `assignedTeacher: req.user.id` now goes
// through these two helpers so both teacher roles share the same set of
// endpoints.
const studentAccessFilter = (user, studentId) =>
  user.role === "shadow_teacher"
    ? { _id: studentId, assignedTeacher: user.id }
    : { _id: studentId, branch: user.branch };

const studentListFilter = (user) =>
  user.role === "shadow_teacher"
    ? { assignedTeacher: user.id }
    : { branch: user.branch };

const accessDeniedMessage = (user) =>
  user.role === "shadow_teacher"
    ? "This student is not assigned to you"
    : "This student is not in your branch";

// @route   GET /api/teacher/profile
// @access  Shadow Teacher only
// Returns the logged-in teacher's own name + TeacherProfile details for the
// dashboard info card.
export const getMyTeacherProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("name username");
    const profile = await TeacherProfile.findOne({ user: req.user.id });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Teacher account not found",
      });
    }

    res.json({
      success: true,
      teacher: {
        name: user.name,
        username: user.username,
        qualification: profile?.qualification || "",
        specialization: profile?.specialization || "",
        experienceYears: profile?.experienceYears || 0,
        age: profile?.age || null,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/teacher/symptom-options
// @access  Shadow Teacher only
// Returns the fixed list of checkbox symptom options so the frontend
// never has to hard-code it separately from the model.
export const getSymptomOptions = (req, res) => {
  res.json({
    success: true,
    options: SYMPTOM_OPTIONS,
  });
};

// @route   GET /api/teacher/students
// @access  Shadow Teacher, Class Teacher
// Shadow teachers see their one assigned student; class/subject teachers
// see every student in their branch. Includes the extra profile fields
// (admission number, DOB, parent/guardian contact) so the student hub page
// can render a real profile view, not just the flag + quick-action tiles.
export const getMyStudents = async (req, res) => {
  try {
    const students = await Student.find(studentListFilter(req.user)).select(
      "fullName grade section diagnosis communicationLevel flagged flagNote admissionNumber dateOfBirth gender programCategory parentFirstName parentRelationship parentPhone parentEmail homeCity"
    );

    res.json({
      success: true,
      students,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/teacher/students/:studentId/today
// @access  Shadow Teacher, Class Teacher
// Returns today's symptom log and emotion check-in (if any) for a student,
// so the teacher's session page knows what's already been submitted today.
export const getStudentToday = async (req, res) => {
  const { studentId } = req.params;

  try {
    const student = await Student.findOne(
      studentAccessFilter(req.user, studentId)
    );

    if (!student) {
      return res.status(403).json({
        success: false,
        message: accessDeniedMessage(req.user),
      });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [symptomLog, emotionCheckin] = await Promise.all([
      SymptomLog.findOne({
        student: studentId,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      }).sort({ createdAt: -1 }),
      EmotionCheckin.findOne({
        student: studentId,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      }).sort({ createdAt: -1 }),
    ]);

    res.json({
      success: true,
      symptomLog,
      emotionCheckin,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   POST /api/teacher/symptoms
// @access  Shadow Teacher, Class Teacher
// Body: { studentId, symptoms: string[], additionalNotes, medications?, medicationNotes? }
// medications: [{ name, dosage?, time? }] — client meeting 20 Feb 2026:
// medication details must be recorded within the symptom tracker.
// Academic Year/Term are no longer picked by the teacher on this form —
// tapping through a Year/Term selector on every single symptom log was
// exactly the kind of per-entry friction that drove down the Task
// Completion Speed score in usability testing (3.09/5). Same auto-tagging
// the child's one-tap emotion check-in already used: derive today's term
// from the configured AcademicTerm calendar server-side instead.
export const logSymptoms = async (req, res) => {
  const {
    studentId,
    symptoms,
    additionalNotes,
    medications,
    medicationNotes,
  } = req.body;

  try {
    if (!studentId || !symptoms || symptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one symptom",
      });
    }

    const matchingTerm = await resolveTermForDate(new Date());
    if (!matchingTerm) {
      return res.status(400).json({
        success: false,
        message:
          "Today isn't covered by the school's academic calendar yet — ask an admin to configure it under Academic Terms before logging symptoms.",
      });
    }

    // Confirm this teacher actually has access to this student.
    const student = await Student.findOne(
      studentAccessFilter(req.user, studentId)
    );

    if (!student) {
      return res.status(403).json({
        success: false,
        message: accessDeniedMessage(req.user),
      });
    }

    const log = await SymptomLog.create({
      student: studentId,
      teacher: req.user.id,
      symptoms,
      additionalNotes,
      medications: (medications || []).filter((m) => m?.name?.trim()),
      medicationNotes,
      academicYear: matchingTerm.academicYear,
      term: matchingTerm.term,
    });

    // FR-10: re-check alert thresholds now that a new log exists.
    await evaluateThresholds(studentId);

    res.status(201).json({
      success: true,
      message: "Symptom recorded",
      log,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/teacher/students/:studentId/symptoms
// @access  Shadow Teacher, Class Teacher
// Returns the full symptom history for a student, most recent first
export const getSymptomHistory = async (req, res) => {
  const { studentId } = req.params;

  try {
    const student = await Student.findOne(
      studentAccessFilter(req.user, studentId)
    );

    if (!student) {
      return res.status(403).json({
        success: false,
        message: accessDeniedMessage(req.user),
      });
    }

    const logs = await SymptomLog.find({ student: studentId })
      .populate("teacher", "name role")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   PATCH /api/teacher/symptoms/:logId
// @access  Shadow Teacher, Class Teacher
// Body: { symptoms, additionalNotes, medications, medicationNotes }
// A teacher can only correct their own logged entries — not ones logged by
// another teacher or by admin — so a wrong mood emoji or a typo doesn't
// require going through admin to fix.
export const updateOwnSymptomLog = async (req, res) => {
  const { logId } = req.params;
  const { symptoms, additionalNotes, medications, medicationNotes } = req.body;

  try {
    if (!symptoms || symptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one symptom",
      });
    }

    const log = await SymptomLog.findById(logId);
    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Symptom log not found",
      });
    }

    if (log.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only edit symptom logs you recorded yourself",
      });
    }

    log.symptoms = symptoms;
    log.additionalNotes = additionalNotes;
    log.medications = (medications || []).filter((m) => m?.name?.trim());
    log.medicationNotes = medicationNotes;
    await log.save();
    await log.populate("teacher", "name role");

    res.json({
      success: true,
      message: "Symptom log updated",
      log,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   DELETE /api/teacher/symptoms/:logId
// @access  Shadow Teacher, Class Teacher
export const deleteOwnSymptomLog = async (req, res) => {
  const { logId } = req.params;

  try {
    const log = await SymptomLog.findById(logId);
    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Symptom log not found",
      });
    }

    if (log.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only delete symptom logs you recorded yourself",
      });
    }

    await log.deleteOne();

    res.json({
      success: true,
      message: "Symptom log deleted",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   POST /api/teacher/emotion-checkin/child
// @access  Shadow Teacher, Class Teacher
// Body: { studentId, childEmoji }
// Step 1 of the in-person emotion check-in popup. There is no child login —
// the shadow teacher hands their device to the child, the child taps their
// own emoji, and that tap is recorded here. Step 2 is submitEmotionCheckin
// below (the teacher's own independent observation), which is also the
// step that generates the FR-09 activity plan, since that's the point at
// which both sides of the check-in exist.
//
// Same "no specific time" behaviour as symptom logging: a fresh check-in
// is always created here (never merged into an earlier same-day one), so
// a shadow teacher can run this popup as many times a day as needed. The
// returned checkin's _id is passed back into submitEmotionCheckin as
// checkinId so step 2 links to *this* exact tap instead of guessing by day.
export const submitChildEmojiCheckin = async (req, res) => {
  const { studentId, childEmoji } = req.body;

  try {
    if (
      !studentId ||
      !childEmoji ||
      !Object.keys(EMOJI_SCORES).includes(childEmoji)
    ) {
      return res.status(400).json({
        success: false,
        message: "studentId and a valid childEmoji are required",
      });
    }

    const student = await Student.findOne(
      studentAccessFilter(req.user, studentId)
    );

    if (!student) {
      return res.status(403).json({
        success: false,
        message: accessDeniedMessage(req.user),
      });
    }

    // Left null if today's date doesn't fall inside any configured term —
    // same "don't block the check-in over calendar gaps" behaviour used
    // throughout the rest of this flow.
    const matchingTerm = await resolveTermForDate(new Date());

    const checkin = await EmotionCheckin.create({
      student: studentId,
      teacher: req.user.id,
      childEmoji,
      academicYear: matchingTerm?.academicYear,
      term: matchingTerm?.term,
    });

    // FR-10: re-check alert thresholds now that the composite score may
    // have changed.
    await evaluateThresholds(studentId);

    res.status(201).json({
      success: true,
      message: "Child's check-in recorded",
      checkin,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   POST /api/teacher/emotion-checkin
// @access  Shadow Teacher, Class Teacher
// Body: { studentId, teacherEmoji, checkinId? }
// Step 2 of the popup: the teacher's own independent observation, recorded
// right after the child's tap (submitChildEmojiCheckin above). When
// checkinId is provided (the normal path — the popup passes back the id
// returned by step 1), it's filled into that exact record so the two taps
// pair up correctly. If it's missing (teacher checking in without a child
// tap first), a fresh standalone record is created instead.
//
// No specific-time / once-a-day restriction here, same as symptom logging —
// each popup run creates its own check-in rather than merging into
// whatever happened earlier that day, so the shadow teacher can run this
// as many times as needed.
//
// Academic Year/Term are auto-derived from today's date against the
// AcademicTerm calendar, so the whole popup is emoji-tap-and-submit with no
// picker anywhere in it.
//
// FR-09: because this is the step that completes the emoji pair, it also
// builds and returns the personalised 3-activity plan (Aesthetic, Social,
// Academic — see utils/aiActivityPlanEngine.js, which calls out to an LLM
// using both emojis + the student's diagnosis and falls back to the
// deterministic utils/activityPlanEngine.js rules if that call fails) so
// the popup can show it immediately as the final screen, without a
// separate fetch.
export const submitEmotionCheckin = async (req, res) => {
  const { studentId, teacherEmoji, checkinId } = req.body;

  try {
    if (!studentId || !teacherEmoji) {
      return res.status(400).json({
        success: false,
        message: "studentId and teacherEmoji are required",
      });
    }

    const student = await Student.findOne(
      studentAccessFilter(req.user, studentId)
    );

    if (!student) {
      return res.status(403).json({
        success: false,
        message: accessDeniedMessage(req.user),
      });
    }

    // Left null if today's date doesn't fall inside any configured term —
    // same "don't block the check-in over calendar gaps" behaviour as the
    // child's tap.
    const matchingTerm = await resolveTermForDate(new Date());

    let checkin = checkinId
      ? await EmotionCheckin.findOne({ _id: checkinId, student: studentId })
      : null;

    if (checkin) {
      checkin.teacherEmoji = teacherEmoji;
      checkin.teacher = req.user.id;
      // Fill in / refresh the term tag from today's date — harmless if the
      // child's earlier tap already set the same value.
      if (matchingTerm) {
        checkin.academicYear = matchingTerm.academicYear;
        checkin.term = matchingTerm.term;
      }
      await checkin.save();
    } else {
      checkin = await EmotionCheckin.create({
        student: studentId,
        teacher: req.user.id,
        teacherEmoji,
        academicYear: matchingTerm?.academicYear,
        term: matchingTerm?.term,
      });
    }

    // FR-10: re-check alert thresholds now that the composite score may
    // have changed.
    await evaluateThresholds(studentId);

    // FR-09: build the activity plan from the (now possibly complete)
    // composite score plus whatever symptoms have been logged today, and
    // persist it onto this check-in so the History table can show exactly
    // what was suggested for this specific entry later on.
    const symptomsToday = await symptomsLoggedOn(studentId, new Date());
    const activityPlan = await generateAndSaveActivityPlan(
      checkin,
      student,
      symptomsToday
    );

    res.status(201).json({
      success: true,
      message: "Emotion check-in recorded",
      checkin,
      activityPlan,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/teacher/students/:studentId/emotion-history
// @access  Shadow Teacher, Class Teacher
// Returns the full emotion check-in history for a student, most recent first
export const getEmotionHistory = async (req, res) => {
  const { studentId } = req.params;

  try {
    const student = await Student.findOne(
      studentAccessFilter(req.user, studentId)
    );

    if (!student) {
      return res.status(403).json({
        success: false,
        message: accessDeniedMessage(req.user),
      });
    }

    // Each checkin already carries its own stored activityPlan (set at the
    // moment it was completed — see generateAndSaveActivityPlan), so the
    // History table can show exactly what was suggested for every past
    // entry, not just today's, with no extra AI calls on every page load.
    const checkins = await EmotionCheckin.find({ student: studentId }).sort({
      createdAt: -1,
    });

    // FR-09: alongside the raw history, also surface a suggested activity
    // plan so the Emotion Tracker page can show "what to try next" without
    // needing a brand new check-in just to see it. Normally this is just
    // the most recent check-in's already-stored plan; it's only generated
    // here (and backfilled onto that record) for older check-ins that
    // predate this field, or ones where the AI/rules call never got a
    // chance to run.
    const latestCheckin = checkins[0] || null;
    let activityPlan = latestCheckin?.activityPlan || null;

    if (latestCheckin && !activityPlan && latestCheckin.compositeScore) {
      const symptomsThatDay = await symptomsLoggedOn(
        studentId,
        latestCheckin.createdAt
      );
      activityPlan = await generateAndSaveActivityPlan(
        latestCheckin,
        student,
        symptomsThatDay
      );
    }

    res.json({
      success: true,
      checkins,
      activityPlan,
      diagnosis: student.diagnosis,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   PATCH /api/teacher/emotion-checkin/:checkinId
// @access  Shadow Teacher, Class Teacher
// Body: { childEmoji, teacherEmoji }
// Same "own entries only" rule as symptom logs — a teacher can fix a
// mis-tap on a check-in they recorded, not ones recorded by someone else.
export const updateOwnEmotionCheckin = async (req, res) => {
  const { checkinId } = req.params;
  const { childEmoji, teacherEmoji } = req.body;

  try {
    const checkin = await EmotionCheckin.findById(checkinId);
    if (!checkin) {
      return res.status(404).json({
        success: false,
        message: "Emotion check-in not found",
      });
    }

    if (checkin.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only edit check-ins you recorded yourself",
      });
    }

    if (childEmoji !== undefined) {
      if (childEmoji && !Object.keys(EMOJI_SCORES).includes(childEmoji)) {
        return res.status(400).json({
          success: false,
          message: "Invalid childEmoji",
        });
      }
      checkin.childEmoji = childEmoji || undefined;
    }

    if (teacherEmoji !== undefined) {
      if (teacherEmoji && !Object.keys(EMOJI_SCORES).includes(teacherEmoji)) {
        return res.status(400).json({
          success: false,
          message: "Invalid teacherEmoji",
        });
      }
      checkin.teacherEmoji = teacherEmoji || undefined;
    }

    await checkin.save();

    // FR-09: an edited emoji can change the mood this check-in represents,
    // so regenerate its stored activity plan to match — otherwise the
    // History entry would keep showing a suggestion based on the old,
    // now-corrected emoji. Only worth doing once the score is complete
    // (compositeScore set); a still-partial check-in has nothing to
    // suggest from yet.
    if (checkin.compositeScore) {
      const student = await Student.findById(checkin.student);
      const symptomsThatDay = await symptomsLoggedOn(
        checkin.student,
        checkin.createdAt
      );
      await generateAndSaveActivityPlan(checkin, student, symptomsThatDay);
    }

    res.json({
      success: true,
      message: "Emotion check-in updated",
      checkin,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   DELETE /api/teacher/emotion-checkin/:checkinId
// @access  Shadow Teacher, Class Teacher
export const deleteOwnEmotionCheckin = async (req, res) => {
  const { checkinId } = req.params;

  try {
    const checkin = await EmotionCheckin.findById(checkinId);
    if (!checkin) {
      return res.status(404).json({
        success: false,
        message: "Emotion check-in not found",
      });
    }

    if (checkin.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only delete check-ins you recorded yourself",
      });
    }

    await checkin.deleteOne();

    res.json({
      success: true,
      message: "Emotion check-in deleted",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/teacher/break-activity-options
// @access  Shadow Teacher only
// Fixed checkbox list for the break-time activity log, mirroring
// getSymptomOptions above.
export const getBreakActivityOptions = (req, res) => {
  res.json({
    success: true,
    options: BREAK_ACTIVITY_OPTIONS,
  });
};

// @route   POST /api/teacher/break-activities
// @access  Shadow Teacher, Class Teacher
// Body: { studentId, activities: string[], notes }
// Client meeting 20 Feb 2026: lets parents see what their child did during
// break time within the 6-hour school day.
export const logBreakActivity = async (req, res) => {
  const { studentId, activities, notes } = req.body;

  try {
    if (!studentId || !activities || activities.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one activity",
      });
    }

    const student = await Student.findOne(
      studentAccessFilter(req.user, studentId)
    );

    if (!student) {
      return res.status(403).json({
        success: false,
        message: accessDeniedMessage(req.user),
      });
    }

    const log = await BreakActivityLog.create({
      student: studentId,
      teacher: req.user.id,
      activities,
      notes,
    });

    res.status(201).json({
      success: true,
      message: "Break activity recorded",
      log,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/teacher/students/:studentId/break-activities
// @access  Shadow Teacher, Class Teacher
export const getBreakActivityHistory = async (req, res) => {
  const { studentId } = req.params;

  try {
    const student = await Student.findOne(
      studentAccessFilter(req.user, studentId)
    );

    if (!student) {
      return res.status(403).json({
        success: false,
        message: accessDeniedMessage(req.user),
      });
    }

    const logs = await BreakActivityLog.find({ student: studentId }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   PATCH /api/teacher/students/:studentId/flag
// @access  Shadow Teacher, Class Teacher (within access)
// Body: { flagged: boolean, flagNote?: string }
// Manual "needs attention" flag surfaced on the principal's dashboard.
export const setStudentFlag = async (req, res) => {
  const { studentId } = req.params;
  const { flagged, flagNote } = req.body;

  try {
    const student = await Student.findOneAndUpdate(
      studentAccessFilter(req.user, studentId),
      { flagged: Boolean(flagged), flagNote: flagNote || "" },
      { new: true }
    );

    if (!student) {
      return res.status(403).json({
        success: false,
        message: accessDeniedMessage(req.user),
      });
    }

    // FR-10: manual flags push an alert immediately; unflagging clears it.
    if (flagged) {
      await raiseManualFlagAlert(studentId, flagNote);
    } else {
      await clearManualFlagAlert(studentId);
    }

    res.json({
      success: true,
      message: flagged ? "Student flagged" : "Flag cleared",
      student,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};