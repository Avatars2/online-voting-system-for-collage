import User from "../models/User.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "online_voting_system_secret";

// Password validation function (same as frontend)
function validatePassword(password) {
  if (!password || password.length < 6) {
    return { isValid: false, error: "Password must be at least 6 characters" };
  }
  
  // Check for at least one letter
  if (!/[a-zA-Z]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one letter" };
  }
  
  // Check for at least one number
  if (!/\d/.test(password)) {
    return { isValid: false, error: "Password must contain at least one number" };
  }
  
  // Check for at least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one special character" };
  }
  
  return { isValid: true };
}

export async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isAdmin = user.is_admin === true || user.role === "admin";
    const role = user.role || (isAdmin ? "admin" : "student");
    const redirect = isAdmin ? "/admin/dashboard" : "/student/dashboard";

    const token = jwt.sign(
      { id: user._id, role, is_admin: isAdmin },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({ role, redirect, token });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error during login" });
  }
}

export async function logout(req, res) {
  return res.status(200).json({ message: "Logged out" });
}

export async function verifyToken(req, res) {
  try {
    const userId = req.userId || req.user?._id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const user = await User.findById(userId).select("-password").populate("department class");
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.status(200).json({ user });
  } catch (err) {
    console.error("verifyToken error:", err);
    return res.status(500).json({ error: "Server error verifying token" });
  }
}

export async function changePassword(req, res) {
  try {
    const userId = req.userId || req.user?._id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "oldPassword and newPassword are required" });
    }

    // Validate new password using same validation as login
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const isValid = await user.comparePassword(oldPassword);
    if (!isValid) return res.status(401).json({ error: "Current password is incorrect" });

    // Check if new password is same as old password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({ error: "New password must be different from current password" });
    }

    user.password = String(newPassword);
    await user.save();

    return res.status(200).json({ ok: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("changePassword error:", err);
    return res.status(500).json({ error: "Server error changing password" });
  }
}

export async function updateMe(req, res) {
  try {
    const userId = req.userId || req.user?._id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const { name, phone, avatarUrl } = req.body || {};
    const updates = {};

    if (name !== undefined) updates.name = String(name).trim();
    if (phone !== undefined) updates.phone = phone ? String(phone).trim() : "";
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl ? String(avatarUrl).trim() : "";

    const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select("-password").populate("department class");
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.status(200).json({ ok: true, user });
  } catch (err) {
    console.error("updateMe error:", err);
    return res.status(500).json({ error: "Server error updating profile" });
  }
}
