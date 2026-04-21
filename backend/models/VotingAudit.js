import mongoose from 'mongoose';

const votingAuditSchema = new mongoose.Schema({
  // Core Voting Information
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  electionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Election', required: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
  votedAt: { type: Date, required: true },
  deletedAt: { type: Date, required: true },
  
  // User Information (Preserved for Audit)
  originalUserInfo: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, required: true },
    studentId: { type: String },
    department: { type: String },
    class: { type: String }
  },
  
  // Deletion Information
  deletedBy: { type: String, required: true }, // "admin (name)" format
  deletionReason: { type: String, default: 'Account deletion' },
  
  // Advanced Fraud Detection Data
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
  
  deviceInfo: {
    userAgent: { type: String, required: false },
    browser: { type: String, required: false },
    os: { type: String, required: false },
    device: { type: String, required: false }, // mobile, tablet, desktop
    screenResolution: { type: String, required: false },
    language: { type: String, required: false },
    timezone: { type: String, required: false }
  },
  
  // Location Data (Optional but powerful for fraud detection)
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
    },
    city: { type: String, required: false },
    country: { type: String, required: false },
    isp: { type: String, required: false }
  },
  
  // Voting Metadata
  votingMetadata: {
    voteType: { 
      type: String, 
      enum: ['regular', 'proxy', 'absentee', 'early', 'mobile'], 
      default: 'regular' 
    },
    votingMethod: { 
      type: String, 
      enum: ['web', 'mobile', 'kiosk', 'mail'], 
      default: 'web' 
    },
    sessionDuration: { type: Number, required: false }, // in seconds
    pageClicks: { type: Number, default: 0 },
    timeSpentOnBallot: { type: Number, default: 0 }, // in seconds
    verificationAttempts: { type: Number, default: 1 },
    lastVerificationAt: { type: Date, required: false }
  },
  
  // Security & Fraud Analysis
  securityAnalysis: {
    riskScore: { 
      type: Number, 
      min: 0, 
      max: 100, 
      default: 0 
    },
    fraudFlags: [{
      type: { 
        type: String, 
        enum: [
          'multiple_votes_same_election',
          'rapid_successive_votes',
          'ip_location_mismatch',
          'device_fingerprint_change',
          'unusual_voting_hours',
          'suspicious_voting_pattern',
          'proxy_detected',
          'vpn_detected',
          'automated_behavior',
          'session_anomaly',
          'verification_failures',
          'geolocation_impossible'
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
      confidence: { 
        type: Number, 
        min: 0, 
        max: 100, 
        default: 50 
      },
      metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
    }],
    behavioralPatterns: {
      averageVotingTime: { type: Number, default: 0 },
      typicalVotingHours: [Number],
      deviceConsistency: { type: Boolean, default: true },
      locationConsistency: { type: Boolean, default: true },
      votingFrequency: { type: Number, default: 0 }
    },
    networkAnalysis: {
      uniqueIPs: { type: Number, default: 1 },
      uniqueDevices: { type: Number, default: 1 },
      sharedNetworkDetected: { type: Boolean, default: false },
      corporateNetwork: { type: Boolean, default: false },
      mobileNetwork: { type: Boolean, default: false }
    }
  },
  
  // Election Context
  electionContext: {
    electionTitle: { type: String, required: true },
    electionType: { 
      type: String, 
      enum: ['general', 'department', 'class', 'special'], 
      required: true 
    },
    candidateName: { type: String, required: true },
    candidatePosition: { type: String, required: false },
    totalCandidates: { type: Number, required: false },
    electionDuration: { 
      start: { type: Date, required: true },
      end: { type: Date, required: true }
    }
  }
}, { 
  timestamps: true,
  // Enable geospatial queries for location-based fraud detection
  index: { location: '2dsphere' }
});

// Compound indexes for advanced fraud detection queries
votingAuditSchema.index({ userId: 1, electionId: 1 });
votingAuditSchema.index({ electionId: 1, votedAt: -1 });
votingAuditSchema.index({ candidateId: 1, votedAt: -1 });
votingAuditSchema.index({ ipAddress: 1, votedAt: -1 });
votingAuditSchema.index({ 'deviceInfo.userAgent': 1, votedAt: -1 });
votingAuditSchema.index({ 'securityAnalysis.riskScore': -1 });
votingAuditSchema.index({ 'securityAnalysis.fraudFlags.type': 1, 'securityAnalysis.fraudFlags.severity': 1 });
votingAuditSchema.index({ deletedAt: -1 });

// Advanced fraud detection methods
votingAuditSchema.statics.detectAdvancedFraud = function(electionId, options = {}) {
  const pipeline = [
    // Filter for specific election
    { $match: { electionId: new mongoose.Types.ObjectId(electionId) } },
    
    // Group by user to find suspicious patterns
    {
      $group: {
        _id: '$userId',
        votes: { $push: '$$ROOT' },
        totalVotes: { $sum: 1 },
        uniqueIPs: { $addToSet: '$ipAddress' },
        uniqueDevices: { $addToSet: '$deviceInfo.userAgent' },
        uniqueLocations: { $addToSet: '$location.coordinates' },
        votingTimes: { $push: '$votedAt' },
        riskScores: { $push: '$securityAnalysis.riskScore' }
      }
    },
    
    // Calculate suspicious metrics
    {
      $addFields: {
        multipleVotes: { $gt: ['$totalVotes', 1] },
        multipleIPs: { $gt: [{ $size: '$uniqueIPs' }, 1] },
        multipleDevices: { $gt: [{ $size: '$uniqueDevices' }, 1] },
        multipleLocations: { $gt: [{ $size: '$uniqueLocations' }, 1] },
        avgRiskScore: { $avg: '$riskScores' },
        timeSpan: {
          $subtract: [
            { $max: '$votingTimes' },
            { $min: '$votingTimes' }
          ]
        }
      }
    },
    
    // Flag suspicious users
    {
      $addFields: {
        suspiciousFlags: {
          $filter: {
            input: [
              { $cond: [{ $gt: ['$totalVotes', 1] }, 'multiple_votes_same_election', null] },
              { $cond: [{ $lt: ['$timeSpan', 60000] }, 'rapid_successive_votes', null] }, // < 1 minute
              { $cond: [{ $gt: [{ $size: '$uniqueIPs' }, 1] }, 'ip_location_mismatch', null] },
              { $cond: [{ $gt: [{ $size: '$uniqueDevices' }, 1] }, 'device_fingerprint_change', null] },
              { $cond: [{ $gt: [{ $size: '$uniqueLocations' }, 1] }, 'geolocation_impossible', null] }
            ],
            cond: { $ne: ['$$this', null] }
          }
        }
      }
    },
    
    // Only return suspicious cases
    { $match: { suspiciousFlags: { $ne: [] } } },
    
    // Sort by risk
    { $sort: { avgRiskScore: -1, totalVotes: -1 } }
  ];
  
  if (options.minRiskScore) {
    pipeline.push({ $match: { avgRiskScore: { $gte: options.minRiskScore } } });
  }
  
  return this.aggregate(pipeline);
};

// Network-based fraud detection
votingAuditSchema.statics.detectNetworkFraud = function(electionId) {
  return this.aggregate([
    { $match: { electionId: new mongoose.Types.ObjectId(electionId) } },
    {
      $group: {
        _id: '$ipAddress',
        users: { $addToSet: '$userId' },
        devices: { $addToSet: '$deviceInfo.userAgent' },
        locations: { $addToSet: '$location.coordinates' },
        votes: { $sum: 1 },
        uniqueUsers: { $size: { $setUnion: ['$users', []] } }
      }
    },
    {
      $addFields: {
        suspiciousFlags: {
          $filter: {
            input: [
              { $cond: [{ $gt: ['$uniqueUsers', 3] }, 'shared_network_abuse', null] },
              { $cond: [{ $gt: [{ $size: '$devices' }, 5] }, 'bot_network_detected', null] },
              { $cond: [{ $gt: ['$votes', 10] }, 'automated_voting', null] }
            ],
            cond: { $ne: ['$$this', null] }
          }
        }
      }
    },
    { $match: { suspiciousFlags: { $ne: [] } } },
    { $sort: { votes: -1 } }
  ]);
};

// Time-based anomaly detection
votingAuditSchema.statics.detectTemporalAnomalies = function(electionId) {
  return this.aggregate([
    { $match: { electionId: new mongoose.Types.ObjectId(electionId) } },
    {
      $group: {
        _id: {
          hour: { $hour: '$votedAt' },
          date: { $dateToString: { format: '%Y-%m-%d', date: '$votedAt' } }
        },
        votes: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        avgRiskScore: { $avg: '$securityAnalysis.riskScore' }
      }
    },
    {
      $addFields: {
        suspiciousFlags: {
          $filter: {
            input: [
              { $cond: [{ $lt: ['$_id.hour', 6] }, 'unusual_voting_hours', null] },
              { $cond: [{ $gt: ['$_id.hour', 23] }, 'unusual_voting_hours', null] },
              { $cond: [{ $gt: ['$votes', 100] }, 'voting_spike_detected', null] },
              { $cond: [{ $gt: ['$avgRiskScore', 70] }, 'high_risk_period', null] }
            ],
            cond: { $ne: ['$$this', null] }
          }
        }
      }
    },
    { $match: { suspiciousFlags: { $ne: [] } } },
    { $sort: { votes: -1 } }
  ]);
};

export default mongoose.models.VotingAudit || mongoose.model('VotingAudit', votingAuditSchema);
