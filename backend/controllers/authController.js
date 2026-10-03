const crypto = require("crypto");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");

// @route  POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Email already registered, please login" });
    }

    const user = await User.create({ name, email, password, phone, address });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      address: user.address,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route  POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route  POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Same reply hamesha, taaki koi ye na pata kar sake ki kaunsi email registered hai
    const genericMsg = "If this email is registered, a reset link has been sent.";
    if (!user) return res.json({ message: genericMsg });

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minute
    await user.save();

    const link = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}`;
    await sendEmail({
      to: user.email,
      subject: "Reset your Parika password",
      html: `<p>Hi ${user.name},</p>
             <p>Click below to reset your password. Link expires in 15 minutes.</p>
             <p><a href="${link}">Reset password</a></p>
             <p>If you didn't request this, ignore this email.</p>`,
    });

    res.json({ message: genericMsg });
  } catch (error) {
    console.error("Forgot password error:", error.message);
    res.status(500).json({ message: "Could not send reset email. Try again later." });
  }
};

// @route  POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const hashed = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpire: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: "Link is invalid or expired" });

    user.password = password; // model ka pre-save hook isse hash kar dega
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: "Password updated. You can log in now." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { signup, login, forgotPassword, resetPassword };