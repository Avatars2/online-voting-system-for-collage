import mongoose from "mongoose";

const classSchema = new mongoose.Schema({
  name: { type: String, required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
  year: { type: String },
}, { timestamps: true });

export default mongoose.models.Class || mongoose.model("Class", classSchema);
