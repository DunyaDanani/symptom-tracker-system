import AcademicTerm, {
  TERMS,
  PROGRAM_CATEGORIES,
  ACADEMIC_YEAR_REGEX,
  startOfDayUTC,
  endOfDayUTC,
} from "../models/AcademicTerm.js";
import Student, { BRANCHES } from "../models/Student.js";

const CATEGORY_LABEL = { national: "National", cambridge: "Cambridge" };

// The calendar a term belongs to. Legacy rows have neither field, which
// Mongo matches with `null`.
const scopeOf = (branch, programCategory) => ({
  branch: branch ?? null,
  programCategory: programCategory ?? null,
});

// Which calendar applies to a student: their own branch + curriculum if
// the admin has set one up, otherwise any legacy school-wide terms.
export const termScopeForStudent = async (student) => {
  if (student?.branch && student?.programCategory) {
    const scoped = scopeOf(student.branch, student.programCategory);
    if (await AcademicTerm.exists(scoped)) return scoped;
  }
  return scopeOf(null, null);
};

// Returns the first configured term (other than `excludeId`) whose date
// range overlaps [startDate, endDate], or null. Two terms covering the same
// day would make resolveTermForDate pick one arbitrarily, so the same
// symptom log / check-in could be tagged to the wrong term.
const findOverlappingTerm = (scope, startDate, endDate, excludeId = null) => {
  const query = {
    ...scope,
    startDate: { $lte: endOfDayUTC(endDate) },
    endDate: { $gte: startOfDayUTC(startDate) },
  };
  if (excludeId) query._id = { $ne: excludeId };
  return AcademicTerm.findOne(query);
};

// The same term may be set up only once per calendar: one "Term 1 2026"
// for Wattala · National, one for Wattala · Cambridge, and so on. Checked
// explicitly (case/space-insensitive year) as well as by the unique index,
// so a duplicate is refused even if the index hasn't been built yet.
const findDuplicateTerm = (scope, academicYear, term, excludeId = null) => {
  const query = { ...scope, academicYear: String(academicYear).trim(), term };
  if (excludeId) query._id = { $ne: excludeId };
  return AcademicTerm.findOne(query);
};

const duplicateMessage = (term, academicYear, branch, programCategory) =>
  `${term} ${academicYear} is already set up for ${branch} (${CATEGORY_LABEL[programCategory] || programCategory}). Edit the existing term instead of adding another.`;

const formatDay = (date) => new Date(date).toISOString().slice(0, 10);

const overlapMessage = (other) =>
  `These dates overlap ${other.term} ${other.academicYear} for this branch and curriculum (${formatDay(
    other.startDate
  )} to ${formatDay(other.endDate)})`;

// Finds whichever configured AcademicTerm (in the student's branch +
// curriculum calendar) has a [startDate, endDate] range containing the
// given date, or null if the date doesn't fall inside any
// configured term (e.g. the calendar hasn't been set up yet, or the date
// is a school holiday gap between terms). Used to auto-tag the child's own
// one-tap emotion check-in, and to suggest a sensible default on the
// adult-facing manual selectors.
export const resolveTermForDate = async (date, student) => {
  const target = date instanceof Date ? date : new Date(date);
  const scope = await termScopeForStudent(student);
  // Compare against the start of the target's day so rows saved before
  // end dates were normalised to 23:59:59.999 still include their last day.
  return AcademicTerm.findOne({
    ...scope,
    startDate: { $lte: target },
    endDate: { $gte: startOfDayUTC(target) },
  }).sort({ startDate: -1 });
};

// Validates branch + programCategory from a request body. Returns an error
// message, or null when both are valid.
const scopeError = (branch, programCategory) => {
  if (!BRANCHES.includes(branch)) return "A valid branch is required";
  if (!PROGRAM_CATEGORIES.includes(programCategory))
    return "Category must be National or Cambridge";
  return null;
};

// @route   GET /api/academic-terms
// @access  Any authenticated user — every role that logs symptoms/emotion
// check-ins or generates reports needs to read the calendar to populate
// its Academic Year / Term dropdowns.
// Optional ?studentId= returns only the calendar that applies to that
// student (their branch + National/Cambridge), which is what every
// per-student page (logging forms, reports, module uploads) needs. Without
// it, every term is returned — used by the admin Academic Terms page.
export const listAcademicTerms = async (req, res) => {
  try {
    let filter = {};
    if (req.query.studentId) {
      const student = await Student.findById(req.query.studentId).select(
        "branch programCategory"
      );
      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }
      filter = await termScopeForStudent(student);
    }

    const terms = await AcademicTerm.find(filter).sort({
      branch: 1,
      programCategory: 1,
      academicYear: -1,
      term: 1,
    });
    res.json({
      success: true,
      terms,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   POST /api/academic-terms
// @access  Admin only
// Body: { academicYear, term, startDate, endDate }
export const createAcademicTerm = async (req, res) => {
  const { branch, programCategory, academicYear, term, startDate, endDate } =
    req.body;

  try {
    const invalidScope = scopeError(branch, programCategory);
    if (invalidScope) {
      return res.status(400).json({ success: false, message: invalidScope });
    }
    if (!academicYear?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Academic year is required",
      });
    }
    if (!ACADEMIC_YEAR_REGEX.test(academicYear.trim())) {
      return res.status(400).json({
        success: false,
        message: "Academic year must be a 4-digit year (e.g. 2026)",
      });
    }
    if (!TERMS.includes(term)) {
      return res.status(400).json({
        success: false,
        message: "A valid term is required",
      });
    }
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start and end dates are required",
      });
    }
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: "Start date must be before end date",
      });
    }

    const duplicate = await findDuplicateTerm(
      scopeOf(branch, programCategory),
      academicYear,
      term
    );
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: duplicateMessage(term, academicYear.trim(), branch, programCategory),
      });
    }

    const overlapping = await findOverlappingTerm(
      scopeOf(branch, programCategory),
      startDate,
      endDate
    );
    if (overlapping) {
      return res.status(409).json({
        success: false,
        message: overlapMessage(overlapping),
      });
    }

    const academicTerm = await AcademicTerm.create({
      branch,
      programCategory,
      academicYear: academicYear.trim(),
      term,
      startDate,
      endDate,
    });

    res.status(201).json({
      success: true,
      academicTerm,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: `${term} ${academicYear} is already configured for ${branch} (${CATEGORY_LABEL[programCategory]})`,
      });
    }
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   PUT /api/academic-terms/:id
// @access  Admin only
export const updateAcademicTerm = async (req, res) => {
  const { id } = req.params;
  const { branch, programCategory, academicYear, term, startDate, endDate } =
    req.body;

  try {
    const academicTerm = await AcademicTerm.findById(id);
    if (!academicTerm) {
      return res.status(404).json({
        success: false,
        message: "Academic term not found",
      });
    }

    // Every saved term must belong to a branch + curriculum calendar, so a
    // legacy school-wide row gets assigned the first time it's edited.
    const nextBranch = branch !== undefined ? branch : academicTerm.branch;
    const nextCategory =
      programCategory !== undefined ? programCategory : academicTerm.programCategory;
    const invalidScope = scopeError(nextBranch, nextCategory);
    if (invalidScope) {
      return res.status(400).json({ success: false, message: invalidScope });
    }
    academicTerm.branch = nextBranch;
    academicTerm.programCategory = nextCategory;

    if (academicYear !== undefined) {
      if (!academicYear.trim()) {
        return res.status(400).json({
          success: false,
          message: "Academic year is required",
        });
      }
      if (!ACADEMIC_YEAR_REGEX.test(academicYear.trim())) {
        return res.status(400).json({
          success: false,
          message: "Academic year must be a 4-digit year (e.g. 2026)",
        });
      }
      academicTerm.academicYear = academicYear.trim();
    }

    if (term !== undefined) {
      if (!TERMS.includes(term)) {
        return res.status(400).json({
          success: false,
          message: "A valid term is required",
        });
      }
      academicTerm.term = term;
    }

    if (startDate !== undefined) academicTerm.startDate = startDate;
    if (endDate !== undefined) academicTerm.endDate = endDate;

    if (
      new Date(academicTerm.startDate) >= new Date(academicTerm.endDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Start date must be before end date",
      });
    }

    const duplicate = await findDuplicateTerm(
      scopeOf(academicTerm.branch, academicTerm.programCategory),
      academicTerm.academicYear,
      academicTerm.term,
      academicTerm._id
    );
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: duplicateMessage(
          academicTerm.term,
          academicTerm.academicYear,
          academicTerm.branch,
          academicTerm.programCategory
        ),
      });
    }

    const overlapping = await findOverlappingTerm(
      scopeOf(academicTerm.branch, academicTerm.programCategory),
      academicTerm.startDate,
      academicTerm.endDate,
      academicTerm._id
    );
    if (overlapping) {
      return res.status(409).json({
        success: false,
        message: overlapMessage(overlapping),
      });
    }

    await academicTerm.save();

    res.json({
      success: true,
      academicTerm,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "That term and year is already configured for this branch and curriculum",
      });
    }
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   DELETE /api/academic-terms/:id
// @access  Admin only
export const deleteAcademicTerm = async (req, res) => {
  const { id } = req.params;

  try {
    const academicTerm = await AcademicTerm.findByIdAndDelete(id);
    if (!academicTerm) {
      return res.status(404).json({
        success: false,
        message: "Academic term not found",
      });
    }

    res.json({
      success: true,
      message: "Academic term deleted",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
