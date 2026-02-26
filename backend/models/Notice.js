import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String },
  attachment: { type: String },
  audience: { type: String, enum: ["all", "student", "students", "admins"], default: "all" },
}, { timestamps: true });

export default mongoose.models.Notice || mongoose.model("Notice", noticeSchema);
