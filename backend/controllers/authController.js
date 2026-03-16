import User from "../models/User.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "online_voting_system_secret";

// Store OTPs in memory (in production, use Redis or database)
const otpStore = new Map();

// Email transporter configuration (only if email credentials are provided)
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
} else {
  console.warn('Email credentials not provided. OTP functionality will be disabled.');
}

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send Registration Welcome Email
async function sendRegistrationEmail(email, name, role, loginLink) {
  if (!transporter) {
    console.log(`Registration email for ${email}: Welcome ${name} (${role}) - Login: ${loginLink} (Email not configured - showing in console)`);
    return;
  }

  console.log(`sendRegistrationEmail: Sending welcome email to ${email}`);
  
  const roleSpecificContent = {
    hod: {
      title: "Head of Department",
      dashboard: "/hod/dashboard",
      features: ["Manage department classes", "Oversee elections", "View department statistics"]
    },
    teacher: {
      title: "Teacher", 
      dashboard: "/teacher/dashboard",
      features: ["Manage class students", "Conduct elections", "View class statistics"]
    },
    student: {
      title: "Student",
      dashboard: "/student/dashboard", 
      features: ["Participate in elections", "View results", "Update profile"]
    }
  };

  const roleInfo = roleSpecificContent[role] || roleSpecificContent.student;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Registration Successful - Online Voting System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 32px;">🎉 Welcome!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Online Voting System</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; margin: 20px 0;">
          <h2 style="color: #333; margin-bottom: 20px;">Registration Successful</h2>
          <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
            Dear <strong>${name}</strong>,<br><br>
            Your registration as a <strong>${roleInfo.title}</strong> has been successfully completed!
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Your Account Details:</h3>
            <ul style="color: #666; line-height: 1.6;">
              <li><strong>Name:</strong> ${name}</li>
              <li><strong>Role:</strong> ${roleInfo.title}</li>
              <li><strong>Email:</strong> ${email}</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginLink}" 
               style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; 
                      border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
              Login to Your Account
            </a>
          </div>
          
          <p style="color: #666; margin-top: 20px; font-size: 14px;">
            Or copy and paste this link in your browser:<br>
            <span style="word-break: break-all; color: #667eea;">${loginLink}</span>
          </p>
          
          <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #333; margin-top: 0;">What you can do:</h4>
            <ul style="color: #666; margin: 0; padding-left: 20px;">
              ${roleInfo.features.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
          </div>
        </div>
        
        <div style="text-align: center; color: #888; font-size: 12px;">
          <p>If you didn't register for this account, please contact our support team.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`sendRegistrationEmail: Welcome email sent successfully to ${email}`);
  } catch (error) {
    console.error(`sendRegistrationEmail: Failed to send welcome email to ${email}:`, error);
    throw error;
  }
}

// Export the registration email function
export { sendRegistrationEmail };

// Send OTP email
async function sendOTPEmail(email, otp) {
  if (!transporter) {
    console.log(`OTP for ${email}: ${otp} (Email not configured - showing in console)`);
    return;
  }

  console.log(`sendOTPEmail: Sending email to ${email}`);
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'OTP for Voting Verification',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 32px;">🔐 OTP Verification</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Online Voting System</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; margin: 20px 0;">
          <h2 style="color: #333; margin-bottom: 20px;">Your One-Time Password</h2>
          <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; border: 2px dashed #667eea;">
            <span style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px;">${otp}</span>
          </div>
          <p style="color: #666; margin-top: 20px; font-size: 14px;">
            This OTP will expire in <strong>10 minutes</strong>.
          </p>
        </div>
        
        <div style="text-align: center; color: #888; font-size: 12px;">
          <p>If you didn't request this OTP, please ignore this email.</p>
          <p>Do not share this OTP with anyone for security reasons.</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`sendOTPEmail: Email sent successfully to ${email}`);
  } catch (error) {
    console.error(`sendOTPEmail: Failed to send email to ${email}:`, error);
    throw error;
  }
}

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
    
    // Determine redirect based on role
    let redirect;
    switch (role) {
      case "admin":
        redirect = "/admin/dashboard";
        break;
      case "hod":
        redirect = "/hod/dashboard";
        break;
      case "teacher":
        redirect = "/teacher/dashboard";
        break;
      default:
        redirect = "/student/dashboard";
    }

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

    const user = await User.findById(userId).select("-password")
      .populate("department class")
      .populate("assignedDepartment", "name")
      .populate("assignedClass", "name year department")
      .populate({
        path: "assignedClass",
        populate: {
          path: "department",
          select: "name"
        }
      });
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

    const user = await User.findByIdAndUpdate(userId, updates, { new: true })
      .select("-password")
      .populate("department class")
      .populate("assignedDepartment", "name")
      .populate("assignedClass", "name year department")
      .populate({
        path: "assignedClass",
        populate: {
          path: "department",
          select: "name"
        }
      });
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.status(200).json({ ok: true, user });
  } catch (err) {
    console.error("updateMe error:", err);
    return res.status(500).json({ error: "Server error updating profile" });
  }
}

// Forgot Password Function
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    
    // Find user by email
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email address' });
    }
    
    // Generate reset token
    const resetToken = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        type: 'password-reset' 
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;
    
    // Log reset link for development
    console.log(`Password reset link for ${email}: ${resetLink}`);
    
    // Send reset email
    if (transporter) {
      try {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: 'Password Reset Request - Online Voting System',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 32px;">🔐 Password Reset</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Online Voting System</p>
              </div>
              
              <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; margin: 20px 0;">
                <h2 style="color: #333; margin-bottom: 20px;">Reset Your Password</h2>
                <p style="color: #666; margin-bottom: 20px;">
                  Hello ${user.name},<br><br>
                  We received a request to reset your password. Click the button below to reset your password:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetLink}" 
                     style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; 
                            border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                    Reset Password
                  </a>
                </div>
                
                <p style="color: #666; margin-top: 20px; font-size: 14px;">
                  Or copy and paste this link in your browser:<br>
                  <span style="word-break: break-all; color: #667eea;">${resetLink}</span>
                </p>
                
                <p style="color: #888; margin-top: 30px; font-size: 14px;">
                  This link will expire in <strong>1 hour</strong>.<br>
                  If you didn't request this password reset, please ignore this email.
                </p>
              </div>
              
              <div style="text-align: center; color: #888; font-size: 12px;">
                <p>For security reasons, please don't share this link with anyone.</p>
              </div>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to ${user.email}`);
        
        res.status(200).json({ 
          message: 'Password reset link sent to your email',
          email: user.email
        });
      } catch (emailError) {
        console.error('Failed to send reset email:', emailError);
        // Fallback: return token for development
        res.status(200).json({ 
          message: 'Password reset link generated (email failed - check console)',
          resetToken: resetToken,
          resetLink: resetLink,
          email: user.email
        });
      }
    } else {
      // No email configuration - return token for development
      console.log(`Password reset link for ${email}: ${resetLink}`);
      res.status(200).json({ 
        message: 'Password reset link generated (email not configured)',
        resetToken: resetToken,
        resetLink: resetLink,
        email: user.email
      });
    }
    
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Failed to process password reset request' });
  }
}

// Send OTP
export async function sendOTP(req, res) {
  try {
    const { email } = req.body || {};
    
    if (!email) {
      console.log("sendOTP: Email is required");
      return res.status(400).json({ error: "Email is required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    console.log(`sendOTP: Processing request for email: ${normalizedEmail}`);
    
    // Check if user exists
    let user = await User.findOne({ email: normalizedEmail });
    
    // For development: create a test user if not found
    if (!user && normalizedEmail === "test@student.com") {
      console.log(`sendOTP: Creating test user for ${normalizedEmail}`);
      try {
        user = new User({
          name: "Test Student",
          email: normalizedEmail,
          password: "test123",
          role: "student"
        });
        await user.save();
        console.log(`sendOTP: Test user created successfully`);
      } catch (createErr) {
        console.error(`sendOTP: Failed to create test user:`, createErr);
      }
    }
    
    if (!user) {
      console.log(`sendOTP: User not found for email: ${normalizedEmail}`);
      return res.status(404).json({ error: "User not found" });
    }

    console.log(`sendOTP: User found: ${user.name} (${user.role})`);

    // Generate and store OTP
    const otp = generateOTP();
    const expiryTime = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    otpStore.set(normalizedEmail, {
      otp,
      expiryTime,
      attempts: 0
    });

    console.log(`sendOTP: Generated OTP: ${otp} for ${normalizedEmail}`);

    // Send OTP email
    try {
      await sendOTPEmail(normalizedEmail, otp);
      console.log(`sendOTP: Email sent successfully to ${normalizedEmail}`);
    } catch (emailError) {
      console.log(`sendOTP: Email failed, but OTP stored: ${emailError.message}`);
      // Continue even if email fails - OTP is stored for console testing
    }

    return res.status(200).json({ 
      message: "OTP sent successfully",
      email: normalizedEmail 
    });
    
  } catch (err) {
    console.error("sendOTP error:", err);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
}

// Reset Password with Token
export async function resetPasswordWithToken(req, res) {
  try {
    const { token, newPassword } = req.body || {};
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required" });
    }

    // Verify the reset token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (tokenError) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Check if this is a password reset token
    if (decoded.type !== 'password-reset') {
      return res.status(401).json({ error: "Invalid token type" });
    }

    // Find user by ID from token
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Update user password
    user.password = newPassword;
    await user.save();

    console.log(`Password reset successfully for ${user.email}`);

    return res.status(200).json({ 
      message: "Password reset successfully"
    });
    
  } catch (err) {
    console.error("resetPasswordWithToken error:", err);
    return res.status(500).json({ error: "Failed to reset password" });
  }
}

// Reset Password (existing OTP-based)
export async function resetPassword(req, res) {
  try {
    const { email, otp, newPassword } = req.body || {};
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Email, OTP, and new password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    
    // Check if user exists
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Update user password
    user.password = newPassword;
    await user.save();

    console.log(`resetPassword: Password reset successfully for ${normalizedEmail}`);

    return res.status(200).json({ 
      message: "Password reset successfully"
    });
    
  } catch (err) {
    console.error("resetPassword error:", err);
    return res.status(500).json({ error: "Failed to reset password" });
  }
}
export async function verifyOTP(req, res) {
  try {
    const { email, otp } = req.body || {};

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Check if OTP exists and is valid
    const storedOTP = otpStore.get(normalizedEmail);

    if (!storedOTP) {
      return res.status(404).json({ error: "OTP not found or expired" });
    }

    // Check if OTP has expired
    if (Date.now() > storedOTP.expiryTime) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ error: "OTP has expired" });
    }

    // Check if OTP matches
    if (storedOTP.otp !== String(otp).trim()) {
      storedOTP.attempts = (storedOTP.attempts || 0) + 1;

      // Lock after 5 attempts
      if (storedOTP.attempts >= 5) {
        otpStore.delete(normalizedEmail);
        return res.status(429).json({ error: "Too many failed attempts. Please request a new OTP" });
      }

      return res.status(401).json({ error: "Invalid OTP" });
    }

    // OTP is valid, remove it from store
    otpStore.delete(normalizedEmail);

    return res.status(200).json({
      message: "OTP verified successfully",
      email: normalizedEmail
    });

  } catch (err) {
    console.error("verifyOTP error:", err);
    return res.status(500).json({ error: "Failed to verify OTP" });
  }
}
