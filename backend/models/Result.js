import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  election: { type: mongoose.Schema.Types.ObjectId, ref: 'Election', required: true },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
  votes: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.models.Result || mongoose.model('Result', resultSchema);
