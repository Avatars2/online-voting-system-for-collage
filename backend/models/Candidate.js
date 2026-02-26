import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
  election: { type: mongoose.Schema.Types.ObjectId, ref: 'Election', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  position: { type: String },
  manifesto: { type: String },
  description: { type: String },
  votes: { type: Number, default: 0 }
}, { timestamps: true });

candidateSchema.index({ election: 1, student: 1 }, { unique: true, sparse: true });

export default mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);
