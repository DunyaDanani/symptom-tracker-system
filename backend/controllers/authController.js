import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Wrong password",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        branch: user.branch, // only set for principal accounts
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.json({
      success: true,
      token,
      role: user.role,
      name: user.name,
      branch: user.branch,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   GET /api/auth/pin-status
// @access  Any authenticated user
export const getPinStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("pin");
    res.json({
      success: true,
      hasPin: !!user?.pin,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   POST /api/auth/set-pin
// @access  Any authenticated user
// Body: { pin: "1234" } — creates or overwrites the user's 4-digit PIN.
export const setPin = async (req, res) => {
  const { pin } = req.body;

  try {
    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: "PIN must be exactly 4 digits",
      });
    }

    const hashedPin = await bcrypt.hash(pin, 10);
    await User.findByIdAndUpdate(req.user.id, { pin: hashedPin });

    res.json({
      success: true,
      message: "PIN saved",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @route   POST /api/auth/verify-pin
// @access  Any authenticated user
// Body: { pin: "1234" }
export const verifyPin = async (req, res) => {
  const { pin } = req.body;

  try {
    if (!pin) {
      return res.status(400).json({
        success: false,
        message: "PIN is required",
      });
    }

    const user = await User.findById(req.user.id).select("pin");

    if (!user?.pin) {
      return res.status(400).json({
        success: false,
        message: "No PIN has been set yet",
      });
    }

    const match = await bcrypt.compare(pin, user.pin);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Incorrect PIN",
      });
    }

    res.json({
      success: true,
      message: "PIN verified",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};