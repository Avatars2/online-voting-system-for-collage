import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ["admin", "student", "hod", "teacher"], default: "student" },
    is_admin: { type: Boolean, default: false },
    studentId: { type: String, trim: true, sparse: true, unique: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
    assignedDepartment: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    assignedClass: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
    votedElections: [{ type: mongoose.Schema.Types.ObjectId, ref: "Election" }],
    
    // Account Security Fields
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    isLocked: { type: Boolean, default: false },
    lastLoginAttempt: { type: Date, default: null },
    passwordResetToken: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
    emailVerificationToken: { type: String, default: null },
    emailVerificationExpires: { type: Date, default: null },
    isEmailVerified: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    suspensionReason: { type: String, default: null },
    suspendedUntil: { type: Date, default: null },
    
    // Soft Delete Fields
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
    originalData: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  // Password hashing
  if (this.isModified("password")) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }
  
  // Enforce single admin rule: only configured admin email can be admin
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "avatars2610@gmail.com";
  const normalizedEmail = String(this.email).trim().toLowerCase();
  
  // If trying to set admin role or is_admin flag
  if (this.role === "admin" || this.is_admin === true) {
    // Only allow if email matches the designated admin email
    if (normalizedEmail !== ADMIN_EMAIL) {
      // Revert to student role
      this.role = "student";
      this.is_admin = false;
    }
  }
  
  // If this is the admin email, ensure it has admin privileges
  if (normalizedEmail === ADMIN_EMAIL) {
    this.role = "admin";
    this.is_admin = true;
  }
  
  next();
});

userSchema.methods.comparePassword = async function (inputPassword) {
  return await bcrypt.compare(inputPassword, this.password);
};

// Account Lockout Methods (disabled - no rate limiting)
userSchema.methods.incLoginAttempts = async function() {
  // No-op - login attempt tracking disabled
  return this;
};

userSchema.methods.resetLoginAttempts = async function() {
  // No-op - login attempt tracking disabled
  return this;
};

userSchema.methods.isLockedAccount = function() {
  // Always return false - account locking disabled
  return false;
};

userSchema.methods.getRemainingLockTime = function() {
  // Always return 0 - no lock time
  return 0;
};

userSchema.methods.lockAccount = async function(duration = null) {
  const lockoutDuration = duration || parseInt(process.env.ACCOUNT_LOCKOUT_DURATION) || 30 * 60 * 1000;
  return this.updateOne({
    $set: {
      isLocked: true,
      lockUntil: Date.now() + lockoutDuration
    }
  });
};

userSchema.methods.unlockAccount = async function() {
  return this.updateOne({
    $unset: { isLocked: 1, lockUntil: 1, loginAttempts: 1, lastLoginAttempt: 1 }
  });
};

userSchema.methods.suspendAccount = async function(reason, duration = null) {
  const suspensionDuration = duration || parseInt(process.env.ACCOUNT_SUSPENSION_DURATION) || 7 * 24 * 60 * 60 * 1000; // 7 days
  return this.updateOne({
    $set: {
      isSuspended: true,
      suspensionReason: reason,
      suspendedUntil: Date.now() + suspensionDuration
    }
  });
};

userSchema.methods.unsuspendAccount = async function() {
  return this.updateOne({
    $unset: { isSuspended: 1, suspensionReason: 1, suspendedUntil: 1 }
  });
};

userSchema.methods.isSuspendedAccount = function() {
  return !!(this.isSuspended && this.suspendedUntil && this.suspendedUntil > Date.now());
};

userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + (parseInt(process.env.PASSWORD_RESET_EXPIRES_IN) || 60 * 60 * 1000); // 1 hour
  
  return resetToken;
};

userSchema.methods.generateEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
  this.emailVerificationExpires = Date.now() + (parseInt(process.env.EMAIL_VERIFICATION_EXPIRES_IN) || 10 * 60 * 1000); // 10 minutes
  
  return verificationToken;
};

export default mongoose.models.User || mongoose.model("User", userSchema);
