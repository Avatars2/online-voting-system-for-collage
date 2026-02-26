import mongoose from "mongoose";

const deptSchema = new mongoose.Schema({
  name: { type: String, required: true },
  hod: { type: String },
}, { timestamps: true });

export default mongoose.models.Department || mongoose.model("Department", deptSchema);
