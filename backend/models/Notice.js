import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String },
  attachment: { type: String }, // Legacy field for backward compatibility
  // PDF attachment fields for base64 storage
  pdfData: {
    filename: { type: String },
    originalName: { type: String },
    mimeType: { type: String, default: 'application/pdf' },
    size: { type: Number },
    base64Data: { type: String } // Base64 encoded PDF data
  },
  audience: { 
    type: String, 
    enum: ["all", "student", "students", "admins", "department_students", "class_students"], 
    default: "all" 
  },
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
  class: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  // For department-specific notices, track which department's students can see this
  targetDepartment: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
  // For class-specific notices, track which class's students can see this
  targetClass: { type: mongoose.Schema.Types.ObjectId, ref: "Class" }
}, { timestamps: true });

export default mongoose.models.Notice || mongoose.model("Notice", noticeSchema);
