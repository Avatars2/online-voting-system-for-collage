import mongoose from 'mongoose';

const electionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  startDate: { type: Date },
  endDate: { type: Date },
  description: { type: String },
  level: { type: String, enum: ['global', 'department', 'class'], default: 'global' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  isPublic: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.models.Election || mongoose.model('Election', electionSchema);
