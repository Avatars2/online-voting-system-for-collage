import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema({
  // Core vote information
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  electionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Election', 
    required: true,
    index: true 
  },
  candidateId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Candidate', 
    required: true,
    index: true 
  },
  votedAt: { 
    type: Date, 
    required: true,
    default: Date.now,
    index: true 
  },
  
  // Vote metadata for audit and fraud detection
  voteMetadata: {
    ipAddress: { 
      type: String, 
      required: false,
      validate: {
        validator: function(v) {
          return !v || /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(v);
        },
        message: 'Invalid IP address format'
      }
    },
    userAgent: { type: String, required: false },
    deviceInfo: {
      browser: { type: String, required: false },
      os: { type: String, required: false },
      device: { type: String, enum: ['mobile', 'tablet', 'desktop'], required: false }
    },
    votingMethod: { 
      type: String, 
      enum: ['web', 'mobile', 'kiosk', 'mail'], 
      default: 'web' 
    },
    sessionDuration: { type: Number, required: false }, // in seconds
    verificationAttempts: { type: Number, default: 1 },
    location: {
      type: { type: String, enum: ['Point'], required: false },
      coordinates: { 
        type: [Number], 
        required: false,
        validate: {
          validator: function(coords) {
            return coords.length === 2 && 
                   coords[0] >= -180 && coords[0] <= 180 && // longitude
                   coords[1] >= -90 && coords[1] <= 90;     // latitude
          },
          message: 'Invalid coordinates'
        }
      }
    }
  },
  
  // Vote status and verification
  voteStatus: {
    isVerified: { type: Boolean, default: true },
    isDisputed: { type: Boolean, default: false },
    disputeReason: { type: String, required: false },
    disputeResolved: { type: Boolean, default: false },
    disputeResolution: { type: String, required: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    verifiedAt: { type: Date, required: false }
  },
  
  // Fraud detection flags
  fraudFlags: [{
    type: { 
      type: String, 
      enum: [
        'duplicate_vote',
        'suspicious_timing',
        'ip_anomaly',
        'device_anomaly',
        'location_anomaly',
        'automated_behavior',
        'verification_failure'
      ], 
      required: true 
    },
    severity: { 
      type: String, 
      enum: ['low', 'medium', 'high', 'critical'], 
      required: true 
    },
    detectedAt: { type: Date, required: true },
    description: { type: String, required: true },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date, required: false }
  }],
  
  // Audit trail
  auditTrail: [{
    action: { type: String, required: true }, // 'created', 'verified', 'disputed', 'resolved'
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    performedAt: { type: Date, required: true, default: Date.now },
    details: { type: String, required: false },
    previousState: { type: mongoose.Schema.Types.Mixed, required: false },
    newState: { type: mongoose.Schema.Types.Mixed, required: false }
  }]
}, { 
  timestamps: true,
  // Enable geospatial queries
  index: { 'voteMetadata.location': '2dsphere' }
});

// Compound indexes for performance and integrity
voteSchema.index({ userId: 1, electionId: 1 }, { unique: true }); // One vote per user per election
voteSchema.index({ electionId: 1, candidateId: 1 });
voteSchema.index({ candidateId: 1, votedAt: -1 });
voteSchema.index({ votedAt: -1 });
voteSchema.index({ 'voteMetadata.ipAddress': 1, votedAt: -1 });
voteSchema.index({ 'voteStatus.isDisputed': 1 });
voteSchema.index({ 'voteStatus.isVerified': 1 });
voteSchema.index({ 'fraudFlags.type': 1, 'fraudFlags.severity': 1 });

// Static methods for vote management
voteSchema.statics.castVote = async function(voteData) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Check if user has already voted in this election
    const existingVote = await this.findOne({ 
      userId: voteData.userId, 
      electionId: voteData.electionId 
    }).session(session);
    
    if (existingVote) {
      throw new Error('User has already voted in this election');
    }
    
    // Create the vote
    const vote = new this(voteData);
    await vote.save({ session });
    
    // Update candidate vote count
    const Candidate = mongoose.model('Candidate');
    await Candidate.findByIdAndUpdate(
      voteData.candidateId,
      { $inc: { votes: 1 } },
      { session }
    );
    
    // Update user's voted elections
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(
      voteData.userId,
      { $addToSet: { votedElections: voteData.electionId } },
      { session }
    );
    
    // Add audit trail entry
    vote.auditTrail.push({
      action: 'created',
      performedAt: new Date(),
      details: `Vote cast for candidate ${voteData.candidateId} in election ${voteData.electionId}`
    });
    
    await vote.save({ session });
    
    await session.commitTransaction();
    return vote;
    
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Method to recount votes for an election
voteSchema.statics.recountElection = async function(electionId) {
  const Vote = this;
  const Candidate = mongoose.model('Candidate');
  
  // Get all votes for this election
  const votes = await Vote.find({ 
    electionId: electionId,
    'voteStatus.isVerified': true,
    'voteStatus.isDisputed': false
  });
  
  // Count votes by candidate
  const voteCounts = {};
  votes.forEach(vote => {
    const candidateId = vote.candidateId.toString();
    voteCounts[candidateId] = (voteCounts[candidateId] || 0) + 1;
  });
  
  // Update all candidates in this election
  const candidates = await Candidate.find({ election: electionId });
  const updates = candidates.map(candidate => {
    const voteCount = voteCounts[candidate._id.toString()] || 0;
    return {
      updateOne: {
        filter: { _id: candidate._id },
        update: { votes: voteCount }
      }
    };
  });
  
  if (updates.length > 0) {
    await Candidate.bulkWrite(updates);
  }
  
  return {
    electionId,
    totalVotes: votes.length,
    voteCounts,
    candidatesUpdated: updates.length
  };
};

// Method to resolve vote disputes
voteSchema.methods.resolveDispute = async function(resolution, resolvedBy) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Update vote status
    this.voteStatus.isDisputed = false;
    this.voteStatus.disputeResolved = true;
    this.voteStatus.disputeResolution = resolution;
    this.voteStatus.verifiedBy = resolvedBy;
    this.voteStatus.verifiedAt = new Date();
    
    // Add audit trail
    this.auditTrail.push({
      action: 'resolved',
      performedBy: resolvedBy,
      performedAt: new Date(),
      details: `Dispute resolved: ${resolution}`,
      previousState: { isDisputed: true },
      newState: { isDisputed: false, disputeResolved: true }
    });
    
    await this.save({ session });
    await session.commitTransaction();
    
    return this;
    
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Method to verify vote
voteSchema.methods.verifyVote = async function(verifiedBy) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Update verification status
    this.voteStatus.isVerified = true;
    this.voteStatus.verifiedBy = verifiedBy;
    this.voteStatus.verifiedAt = new Date();
    
    // Add audit trail
    this.auditTrail.push({
      action: 'verified',
      performedBy: verifiedBy,
      performedAt: new Date(),
      details: 'Vote verified by administrator',
      previousState: { isVerified: false },
      newState: { isVerified: true }
    });
    
    await this.save({ session });
    await session.commitTransaction();
    
    return this;
    
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Method to dispute vote
voteSchema.methods.disputeVote = async function(reason, disputedBy) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Update dispute status
    this.voteStatus.isDisputed = true;
    this.voteStatus.disputeReason = reason;
    
    // Add audit trail
    this.auditTrail.push({
      action: 'disputed',
      performedBy: disputedBy,
      performedAt: new Date(),
      details: `Vote disputed: ${reason}`,
      previousState: { isDisputed: false },
      newState: { isDisputed: true, disputeReason: reason }
    });
    
    await this.save({ session });
    await session.commitTransaction();
    
    return this;
    
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export default mongoose.models.Vote || mongoose.model('Vote', voteSchema);
