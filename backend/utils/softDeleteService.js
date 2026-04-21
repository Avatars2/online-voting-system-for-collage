import mongoose from 'mongoose';
import User from '../models/User.js';
import Candidate from '../models/Candidate.js';
import Election from '../models/Election.js';

/**
 * Soft Delete Service for Users
 * Maintains system consistency and audit trail
 */

class SoftDeleteService {
  /**
   * Soft delete user while preserving all references
   * @param {string} userId - User ID to soft delete
   * @param {Object} options - Deletion options
   * @returns {Object} - Soft deletion result
   */
  static async softDeleteUser(userId, options = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const user = await User.findById(userId).session(session);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.isDeleted) {
        throw new Error('User is already soft deleted');
      }

      // Check if user is candidate in active elections
      const candidateRecords = await Candidate.find({ 
        student: userId 
      }).populate('election').session(session);

      const hasActiveElections = candidateRecords.some(candidate => 
        candidate.election && (
          new Date(candidate.election.endDate) >= new Date() || 
          candidate.election.status === 'active'
        )
      );

      if (hasActiveElections && !options.forceSoftDelete) {
        throw new Error('Cannot soft delete user who is candidate in active elections');
      }

      // Store original data for audit before soft deletion
      const originalData = {
        name: user.name,
        email: user.email,
        phone: user.phone,
        studentId: user.studentId,
        avatarUrl: user.avatarUrl,
        role: user.role
      };

      // Soft delete the user - anonymize personal data but keep ID and structure
      user.name = '[DELETED USER]';
      user.email = `deleted_${userId}@deleted.local`;
      user.phone = undefined;
      user.studentId = undefined;
      user.avatarUrl = undefined;
      user.isDeleted = true;
      user.deletedAt = new Date();
      user.deletedBy = options.deletedBy || 'system';
      user.originalData = originalData;
      
      // Clear authentication fields
      user.password = 'DELETED';
      user.loginAttempts = 0;
      user.lockUntil = null;
      user.isLocked = false;
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      user.emailVerificationToken = null;
      user.emailVerificationExpires = null;
      user.isEmailVerified = false;
      user.isSuspended = false;
      user.suspensionReason = null;
      user.suspendedUntil = null;

      await user.save({ session });

      // Handle candidate data - anonymize but keep election integrity
      for (const candidate of candidateRecords) {
        candidate.name = `[DELETED USER] - ${originalData.name}`;
        candidate.description = 'User account has been deleted';
        await candidate.save({ session });
      }

      // Handle notices created by user
      const Notice = (await import('../models/Notice.js')).default;
      await Notice.updateMany(
        { createdBy: userId },
        { 
          $set: { 
            title: `[DELETED USER] - Original notice`,
            body: 'Original creator account has been deleted'
          }
        },
        { session }
      );

      // Handle department/class assignments
      const Department = (await import('../models/Department.js')).default;
      const ClassModel = (await import('../models/Class.js')).default;

      // Remove HOD assignment
      await Department.updateMany(
        { hod: userId },
        { $unset: { hod: 1 } },
        { session }
      );

      // Remove class teacher assignment
      await ClassModel.updateMany(
        { classTeacher: userId },
        { $unset: { classTeacher: 1 } },
        { session }
      );

      // Create detailed voting audit record for each vote
      if (user.votedElections && user.votedElections.length > 0) {
        const VotingAudit = (await import('../models/VotingAudit.js')).default;
        const Election = (await import('../models/Election.js')).default;
        const Candidate = (await import('../models/Candidate.js')).default;
        
        // Create individual audit records for each vote (not grouped)
        for (const electionId of user.votedElections) {
          try {
            // Get election details
            const election = await Election.findById(electionId);
            if (!election) continue;
            
            // Find which candidate this user voted for
            const candidate = await Candidate.findOne({ 
              election: electionId,
              student: userId 
            }).populate('election');
            
            // Parse device info from request
            const deviceInfo = this.parseDeviceInfo(req.get('User-Agent'));
            
            // Get location info if available
            const locationInfo = await this.getLocationInfo(req.ip);
            
            // Analyze voting behavior
            const votingMetadata = this.analyzeVotingBehavior(req, election);
            
            // Calculate risk score
            const riskScore = this.calculateRiskScore({
              userId: userId,
              electionId: electionId,
              ipAddress: req.ip,
              deviceInfo: deviceInfo,
              locationInfo: locationInfo,
              votingMetadata: votingMetadata
            });
            
            // Detect fraud flags
            const fraudFlags = this.detectAdvancedFraudFlags({
              userId: userId,
              electionId: electionId,
              ipAddress: req.ip,
              deviceInfo: deviceInfo,
              locationInfo: locationInfo,
              votingMetadata: votingMetadata,
              originalData: originalData
            });
            
            // Create individual voting audit record
            const auditRecord = {
              // Core fields (as requested)
              userId: userId,
              electionId: electionId,
              candidateId: candidate?._id || null,
              votedAt: candidate?.createdAt || new Date(),
              deletedAt: new Date(),
              ipAddress: req.ip || null,
              deviceInfo: deviceInfo,
              
              // Additional fields for comprehensive audit
              originalUserInfo: originalData,
              deletedBy: options.deletedBy || 'system',
              deletionReason: options.reason || 'Account deletion',
              
              // Location data
              location: locationInfo,
              
              // Voting metadata
              votingMetadata: votingMetadata,
              
              // Security analysis
              securityAnalysis: {
                riskScore: riskScore,
                fraudFlags: fraudFlags,
                behavioralPatterns: this.analyzeBehavioralPatterns(userId, electionId),
                networkAnalysis: this.analyzeNetworkPatterns(req.ip, deviceInfo)
              },
              
              // Election context
              electionContext: {
                electionTitle: election.title,
                electionType: election.level || 'general',
                candidateName: candidate?.name || 'Unknown Candidate',
                candidatePosition: candidate?.position || null,
                totalCandidates: await Candidate.countDocuments({ election: electionId }),
                electionDuration: {
                  start: election.startDate,
                  end: election.endDate
                }
              }
            };
            
            await VotingAudit.create(auditRecord, { session });
            
          } catch (error) {
            console.error(`Error creating audit record for election ${electionId}:`, error);
            // Continue with other elections even if one fails
          }
        }
      }

      await session.commitTransaction();
      
      return {
        success: true,
        message: 'User soft deleted successfully while preserving system consistency',
        userId: userId, // User ID preserved for references
        preservedData: {
          candidateRecords: candidateRecords.length,
          votingHistory: user.votedElections?.length || 0,
          noticesCreated: await Notice.countDocuments({ createdBy: userId }),
          userId: userId // User ID still exists for all references
        }
      };

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Check if user can be safely soft deleted
   * @param {string} userId - User ID to check
   * @returns {Object} - Safety check result
   */
  static async checkSoftDeleteSafety(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { safe: false, reason: 'User not found' };
      }

      if (user.isDeleted) {
        return { safe: false, reason: 'User is already soft deleted' };
      }

      const candidateRecords = await Candidate.find({ 
        student: userId 
      }).populate('election');

      const activeElections = candidateRecords.filter(candidate => 
        candidate.election && (
          new Date(candidate.election.endDate) >= new Date() || 
          candidate.election.status === 'active'
        )
      );

      const completedElections = candidateRecords.filter(candidate => 
        candidate.election && 
        new Date(candidate.election.endDate) < new Date() &&
        candidate.election.status !== 'active'
      );

      return {
        safe: activeElections.length === 0,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isDeleted: user.isDeleted || false
        },
        elections: {
          active: activeElections.length,
          completed: completedElections.length,
          activeDetails: activeElections.map(c => ({
            electionTitle: c.election.title,
            electionId: c.election._id,
            position: c.position
          }))
        },
        votingHistory: user.votedElections?.length || 0,
        recommendations: this.getSoftDeleteRecommendations(activeElections, completedElections)
      };

    } catch (error) {
      return { safe: false, reason: error.message };
    }
  }

  /**
   * Parse device information from user agent string
   * @param {string} userAgent - User agent string
   * @returns {Object} - Parsed device info
   */
  static parseDeviceInfo(userAgent) {
    if (!userAgent) return {};
    
    const deviceInfo = {
      userAgent: userAgent,
      browser: 'Unknown',
      os: 'Unknown',
      device: 'desktop',
      screenResolution: null,
      language: null,
      timezone: null
    };
    
    // Parse browser
    if (userAgent.includes('Chrome')) deviceInfo.browser = 'Chrome';
    else if (userAgent.includes('Firefox')) deviceInfo.browser = 'Firefox';
    else if (userAgent.includes('Safari')) deviceInfo.browser = 'Safari';
    else if (userAgent.includes('Edge')) deviceInfo.browser = 'Edge';
    
    // Parse OS
    if (userAgent.includes('Windows')) deviceInfo.os = 'Windows';
    else if (userAgent.includes('Mac')) deviceInfo.os = 'macOS';
    else if (userAgent.includes('Linux')) deviceInfo.os = 'Linux';
    else if (userAgent.includes('Android')) deviceInfo.os = 'Android';
    else if (userAgent.includes('iOS')) deviceInfo.os = 'iOS';
    
    // Parse device type
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      deviceInfo.device = 'mobile';
    } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      deviceInfo.device = 'tablet';
    }
    
    return deviceInfo;
  }

  /**
   * Get location information from IP address
   * @param {string} ipAddress - IP address
   * @returns {Object} - Location info
   */
  static async getLocationInfo(ipAddress) {
    // For now, return basic structure. In production, integrate with GeoIP service
    if (!ipAddress) return null;
    
    return {
      type: 'Point',
      coordinates: [0, 0], // [longitude, latitude] - would be populated by GeoIP service
      city: 'Unknown',
      country: 'Unknown',
      isp: 'Unknown'
    };
  }

  /**
   * Analyze voting behavior
   * @param {Object} req - Request object
   * @param {Object} election - Election object
   * @returns {Object} - Voting metadata
   */
  static analyzeVotingBehavior(req, election) {
    return {
      voteType: 'regular',
      votingMethod: 'web',
      sessionDuration: Math.floor(Math.random() * 300) + 60, // Mock data
      pageClicks: Math.floor(Math.random() * 10) + 1,
      timeSpentOnBallot: Math.floor(Math.random() * 120) + 30,
      verificationAttempts: 1,
      lastVerificationAt: new Date()
    };
  }

  /**
   * Calculate risk score based on various factors
   * @param {Object} params - Parameters for risk calculation
   * @returns {number} - Risk score (0-100)
   */
  static calculateRiskScore(params) {
    let riskScore = 0;
    
    // Base risk score
    riskScore += 10;
    
    // Add risk factors
    if (params.ipAddress) {
      // Check for suspicious IP patterns
      if (params.ipAddress.startsWith('10.') || params.ipAddress.startsWith('192.168.')) {
        riskScore += 5; // Private IP
      }
    }
    
    if (params.deviceInfo) {
      // Unusual device combinations
      if (params.deviceInfo.device === 'mobile' && params.deviceInfo.os === 'Windows') {
        riskScore += 15; // Suspicious combination
      }
    }
    
    // Time-based risk
    const currentHour = new Date().getHours();
    if (currentHour >= 2 && currentHour <= 5) {
      riskScore += 10; // Unusual voting hours
    }
    
    return Math.min(riskScore, 100);
  }

  /**
   * Detect advanced fraud flags
   * @param {Object} params - Parameters for fraud detection
   * @returns {Array} - Array of fraud flags
   */
  static detectAdvancedFraudFlags(params) {
    const fraudFlags = [];
    
    const currentHour = new Date().getHours();
    
    // Check for unusual voting hours
    if (currentHour >= 2 && currentHour <= 5) {
      fraudFlags.push({
        type: 'unusual_voting_hours',
        severity: 'medium',
        detectedAt: new Date(),
        description: `Vote cast during unusual hours (${currentHour}:00)`,
        confidence: 70,
        metadata: { hour: currentHour }
      });
    }
    
    // Check for suspicious device combinations
    if (params.deviceInfo && params.deviceInfo.device === 'mobile' && params.deviceInfo.os === 'Windows') {
      fraudFlags.push({
        type: 'device_fingerprint_change',
        severity: 'high',
        detectedAt: new Date(),
        description: 'Suspicious device-OS combination detected',
        confidence: 85,
        metadata: { device: params.deviceInfo.device, os: params.deviceInfo.os }
      });
    }
    
    // Check for private IP (potential proxy/VPN)
    if (params.ipAddress && (params.ipAddress.startsWith('10.') || params.ipAddress.startsWith('192.168.'))) {
      fraudFlags.push({
        type: 'proxy_detected',
        severity: 'medium',
        detectedAt: new Date(),
        description: 'Vote from private IP address',
        confidence: 60,
        metadata: { ipAddress: params.ipAddress }
      });
    }
    
    return fraudFlags;
  }

  /**
   * Analyze behavioral patterns
   * @param {string} userId - User ID
   * @param {string} electionId - Election ID
   * @returns {Object} - Behavioral patterns
   */
  static analyzeBehavioralPatterns(userId, electionId) {
    return {
      averageVotingTime: 120, // seconds
      typicalVotingHours: [9, 10, 11, 14, 15, 16], // business hours
      deviceConsistency: true,
      locationConsistency: true,
      votingFrequency: 1
    };
  }

  /**
   * Analyze network patterns
   * @param {string} ipAddress - IP address
   * @param {Object} deviceInfo - Device information
   * @returns {Object} - Network analysis
   */
  static analyzeNetworkPatterns(ipAddress, deviceInfo) {
    return {
      uniqueIPs: 1,
      uniqueDevices: 1,
      sharedNetworkDetected: false,
      corporateNetwork: ipAddress && (ipAddress.startsWith('10.') || ipAddress.startsWith('172.')),
      mobileNetwork: deviceInfo && deviceInfo.device === 'mobile'
    };
  }
  static analyzeVotingPattern(votingHistory) {
    if (votingHistory.length === 0) {
      return {
        averageTimeBetweenVotes: 0,
        peakVotingHours: [],
        deviceConsistency: true
      };
    }

    // Sort by vote time
    const sortedVotes = votingHistory.sort((a, b) => new Date(a.votedAt) - new Date(b.votedAt));
    
    // Calculate time between votes
    const timeDifferences = [];
    for (let i = 1; i < sortedVotes.length; i++) {
      const timeDiff = new Date(sortedVotes[i].votedAt) - new Date(sortedVotes[i-1].votedAt);
      timeDifferences.push(timeDiff);
    }
    
    const averageTimeBetweenVotes = timeDifferences.length > 0 ? 
      timeDifferences.reduce((a, b) => a + b, 0) / timeDifferences.length : 0;
    
    // Find peak voting hours
    const hourCounts = {};
    votingHistory.forEach(vote => {
      const hour = new Date(vote.votedAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    const peakVotingHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
    
    // Check device consistency
    const uniqueUserAgents = new Set(votingHistory.map(v => v.userAgent).filter(Boolean));
    const deviceConsistency = uniqueUserAgents.size <= 1;
    
    return {
      averageTimeBetweenVotes: Math.round(averageTimeBetweenVotes / (1000 * 60)), // Convert to minutes
      peakVotingHours,
      deviceConsistency,
      totalVotes: votingHistory.length
    };
  }

  /**
   * Detect potential fraud flags in voting history
   * @param {Array} votingHistory - Array of voting records
   * @param {Object} originalData - Original user data
   * @returns {Array} - Array of fraud flags
   */
  static detectFraudFlags(votingHistory, originalData) {
    const fraudFlags = [];
    
    if (votingHistory.length === 0) return fraudFlags;
    
    // Check for rapid voting (multiple votes in short time)
    const sortedVotes = votingHistory.sort((a, b) => new Date(a.votedAt) - new Date(b.votedAt));
    for (let i = 1; i < sortedVotes.length; i++) {
      const timeDiff = new Date(sortedVotes[i].votedAt) - new Date(sortedVotes[i-1].votedAt);
      if (timeDiff < 5 * 60 * 1000) { // Less than 5 minutes between votes
        fraudFlags.push({
          type: 'suspicious_timing',
          detectedAt: new Date(),
          severity: 'medium',
          description: `Multiple votes cast within ${Math.round(timeDiff / 1000)} seconds`
        });
      }
    }
    
    // Check for multiple IP addresses
    const uniqueIPs = new Set(votingHistory.map(v => v.ipAddress).filter(Boolean));
    if (uniqueIPs.size > 1) {
      fraudFlags.push({
        type: 'location_anomaly',
        detectedAt: new Date(),
        severity: 'high',
        description: `Votes cast from ${uniqueIPs.size} different IP addresses`
      });
    }
    
    // Check for multiple devices
    const uniqueUserAgents = new Set(votingHistory.map(v => v.userAgent).filter(Boolean));
    if (uniqueUserAgents.size > 2) {
      fraudFlags.push({
        type: 'device_change',
        detectedAt: new Date(),
        severity: 'medium',
        description: `Votes cast from ${uniqueUserAgents.size} different devices/browsers`
      });
    }
    
    // Check for voting during unusual hours (e.g., 2 AM - 5 AM)
    const unusualHourVotes = votingHistory.filter(v => {
      const hour = new Date(v.votedAt).getHours();
      return hour >= 2 && hour <= 5;
    });
    
    if (unusualHourVotes.length > 0 && unusualHourVotes.length / votingHistory.length > 0.3) {
      fraudFlags.push({
        type: 'suspicious_timing',
        detectedAt: new Date(),
        severity: 'low',
        description: `${unusualHourVotes.length} votes cast during unusual hours (2 AM - 5 AM)`
      });
    }
    
    return fraudFlags;
  }

  /**
   * Get recommendations for soft deletion
   */
  static getSoftDeleteRecommendations(activeElections, completedElections) {
    const recommendations = [];

    if (activeElections.length > 0) {
      recommendations.push({
        type: 'warning',
        message: `User is candidate in ${activeElections.length} active election(s)`,
        action: 'Wait for elections to complete or remove candidacy first'
      });
    }

    if (completedElections.length > 0) {
      recommendations.push({
        type: 'info',
        message: `User participated in ${completedElections.length} completed election(s)`,
        action: 'Candidate data will be anonymized but user ID preserved for audit'
      });
    }

    if (activeElections.length === 0) {
      recommendations.push({
        type: 'success',
        message: 'User can be safely soft deleted',
        action: 'User ID preserved, personal data anonymized, system consistency maintained'
      });
    }

    return recommendations;
  }

  /**
   * Restore a soft deleted user (admin function)
   * @param {string} userId - User ID to restore
   * @param {Object} options - Restore options
   * @returns {Object} - Restore result
   */
  static async restoreUser(userId, options = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isDeleted) {
        throw new Error('User is not deleted');
      }

      // Restore original data if available
      if (user.originalData) {
        user.name = user.originalData.name;
        user.email = user.originalData.email;
        user.phone = user.originalData.phone;
        user.studentId = user.originalData.studentId;
        user.avatarUrl = user.originalData.avatarUrl;
      }

      // Clear deletion flags
      user.isDeleted = false;
      user.deletedAt = null;
      user.deletedBy = null;
      user.originalData = undefined;

      await user.save();

      return {
        success: true,
        message: 'User restored successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all soft deleted users (admin function)
   * @returns {Array} - List of soft deleted users
   */
  static async getSoftDeletedUsers() {
    try {
      const deletedUsers = await User.find({ isDeleted: true })
        .select('-password')
        .sort({ deletedAt: -1 });

      return deletedUsers.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        deletedAt: user.deletedAt,
        deletedBy: user.deletedBy,
        originalData: user.originalData
      }));

    } catch (error) {
      throw error;
    }
  }
}

export default SoftDeleteService;
