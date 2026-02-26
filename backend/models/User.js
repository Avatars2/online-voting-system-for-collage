import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ["admin", "student"], default: "student" },
    is_admin: { type: Boolean, default: false },
    studentId: { type: String, trim: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
    votedElections: [{ type: mongoose.Schema.Types.ObjectId, ref: "Election" }],
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
  
  // Enforce single admin rule: only avatars2610@gmail.com can be admin
  const ADMIN_EMAIL = "avatars2610@gmail.com";
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

export default mongoose.models.User || mongoose.model("User", userSchema);
