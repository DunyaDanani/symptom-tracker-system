import AcademicTerm, { TERMS } from "../models/AcademicTerm.js";

// Finds whichever configured AcademicTerm's [startDate, endDate] range
// contains the given date, or null if the date doesn't fall inside any
// configured term (e.g. the calendar hasn't been set up yet, or the date
// is a school holiday gap between terms). Used to auto-tag the child's own
// one-tap emotion check-in, and to suggest a sensible default on the
// adult-facing manual selectors.
export const resolveTermForDate = async (date) => {
  const target = date instanceof Date ? date : new Date(date);
  return AcademicTerm.findOne({
    startDate: { $lte: target },
    endDate: { $gte: target },
  });
};

// @route   GET /api/academic-terms
// @access  Any authenticated user — every role that logs symptoms/emotion
// check-ins or generates reports needs to read the calendar to populate
// its Academic Year / Term dropdowns.
export const listAcademicTerms = async (req, res) => {
  try {
    const terms = await AcademicTerm.find().sort({
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
  const { academicYear, term, startDate, endDate } = req.body;

  try {
    if (!academicYear?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Academic year is required",
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

    const academicTerm = await AcademicTerm.create({
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
        message: `${req.body.term} for ${req.body.academicYear} is already configured`,
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
  const { academicYear, term, startDate, endDate } = req.body;

  try {
    const academicTerm = await AcademicTerm.findById(id);
    if (!academicTerm) {
      return res.status(404).json({
        success: false,
        message: "Academic term not found",
      });
    }

    if (academicYear !== undefined) {
      if (!academicYear.trim()) {
        return res.status(400).json({
          success: false,
          message: "Academic year is required",
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

    await academicTerm.save();

    res.json({
      success: true,
      academicTerm,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "That academic year and term combination already exists",
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
