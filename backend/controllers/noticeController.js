import Notice from "../models/Notice.js";

// @route   POST /api/notices
// @access  Admin, Principal
// Body: { title, body }
// Principal-authored notices are tagged with their own branch (informational
// only); admin-authored notices carry no branch. Either way the notice goes
// out to every role — see getNotices below.
export const createNotice = async (req, res) => {
  const { title, body } = req.body;

  try {
    if (!title?.trim() || !body?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title and notice text are required",
      });
    }

    const notice = await Notice.create({
      title: title.trim(),
      body: body.trim(),
      postedBy: req.user.id,
      postedByRole: req.user.role,
      branch: req.user.role === "principal" ? req.user.branch || null : null,
    });

    const populated = await notice.populate("postedBy", "name");

    res.status(201).json({
      success: true,
      message: "Notice posted",
      notice: populated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/notices
// @access  Any authenticated user — the full feed goes to everyone
export const getNotices = async (req, res) => {
  try {
    const notices = await Notice.find({})
      .populate("postedBy", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      notices,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   DELETE /api/notices/:id
// @access  Admin (any notice), Principal (only their own)
export const deleteNotice = async (req, res) => {
  const { id } = req.params;

  try {
    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found",
      });
    }

    if (
      req.user.role === "principal" &&
      notice.postedBy.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only delete notices you posted",
      });
    }

    await notice.deleteOne();

    res.json({
      success: true,
      message: "Notice deleted",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
