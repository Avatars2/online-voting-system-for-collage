import mongoose from 'mongoose';
import User from '../models/User.js';
import Candidate from '../models/Candidate.js';
import Election from '../models/Election.js';
import Result from '../models/Result.js';

/**
 * Election Data Protection Utility
 * Ensures election integrity when managing user accounts
 */

class ElectionDataProtection {
  /**
   * Safely remove user while preserving election data
   * @param {string} userId - User ID to remove
   * @param {Object} options - Deletion options
   * @returns {Object} - Deletion result
   */
  static async safeUserRemoval(userId, options = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const user = await User.findById(userId).session(session);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is a candidate in any active or completed elections
      const candidateRecords = await Candidate.find({ 
        student: userId 
      }).populate('election').session(session);

      const hasActiveElections = candidateRecords.some(candidate => 
        candidate.election && (
          new Date(candidate.election.endDate) >= new Date() || 
          candidate.election.status === 'active'
        )
      );

      if (hasActiveElections && !options.forceRemove) {
        throw new Error('Cannot delete user who is a candidate in active elections');
      }

      // Preserve candidate data for historical records
      for (const candidate of candidateRecords) {
        // Anonymize candidate data instead of deleting
        candidate.student = null;
        candidate.name = `[DELETED USER] - ${candidate.name}`;
        candidate.description = 'User account has been deleted';
        await candidate.save({ session });
      }

      // Handle voting history - preserve the votes but anonymize
      if (user.votedElections && user.votedElections.length > 0) {
        // Create anonymous voting record before deleting user
        const VotingAudit = (await import('../models/VotingAudit.js')).default;
        const votingRecord = {
          originalUserId: userId,
          votedElections: user.votedElections,
          deletedAt: new Date(),
          deletedBy: options.deletedBy || 'system',
          originalUserInfo: {
            name: user.name,
            email: user.email,
            role: user.role,
            studentId: user.studentId
          }
        };
        
        await VotingAudit.create(votingRecord, { session });
      }

      // Handle notices created by user
      const Notice = (await import('../models/Notice.js')).default;
      await Notice.updateMany(
        { createdBy: userId },
        { 
          $set: { 
            createdBy: null,
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

      // Finally, delete the user account
      await User.findByIdAndDelete(userId, { session });

      await session.commitTransaction();
      
      return {
        success: true,
        message: 'User removed safely while preserving election data',
        preservedData: {
          candidateRecords: candidateRecords.length,
          votingHistory: user.votedElections?.length || 0,
          noticesCreated: await Notice.countDocuments({ createdBy: userId })
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
   * Check if user can be safely deleted
   * @param {string} userId - User ID to check
   * @returns {Object} - Safety check result
   */
  static async checkDeletionSafety(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { safe: false, reason: 'User not found' };
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
          role: user.role
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
        recommendations: this.getDeletionRecommendations(activeElections, completedElections)
      };

    } catch (error) {
      return { safe: false, reason: error.message };
    }
  }

  /**
   * Get recommendations for user deletion based on their election participation
   * @param {Array} activeElections - Active elections user is participating in
   * @param {Array} completedElections - Completed elections user participated in
   * @returns {Array} - List of recommendations
   */
  static getDeletionRecommendations(activeElections, completedElections) {
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
        action: 'Candidate data will be anonymized but preserved for historical records'
      });
    }

    if (activeElections.length === 0) {
      recommendations.push({
        type: 'success',
        message: 'User can be safely deleted',
        action: 'Election data will be preserved through anonymization'
      });
    }

    return recommendations;
  }

  /**
   * Create audit log for user deletion
   * @param {Object} deletionData - Information about the deletion
   */
  static async createAuditLog(deletionData) {
    // This would require creating an AuditLog model
    const auditData = {
      action: 'USER_DELETION',
      timestamp: new Date(),
      deletedBy: deletionData.deletedBy,
      deletedUser: {
        id: deletionData.userId,
        name: deletionData.userName,
        email: deletionData.userEmail,
        role: deletionData.userRole
      },
      preservedData: deletionData.preservedData,
      reason: deletionData.reason || 'Account deletion'
    };

    console.log('AUDIT LOG:', JSON.stringify(auditData, null, 2));
    // await AuditLog.create(auditData);
  }
}

export default ElectionDataProtection;
