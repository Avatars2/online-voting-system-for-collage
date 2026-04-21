import mongoose from 'mongoose';
import VotingAudit from '../models/VotingAudit.js';

/**
 * Audit Controller for Fraud Detection and Election Verification
 */

export async function detectFraud(req, res) {
  try {
    const { electionId } = req.params;
    
    if (!electionId || !mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({ error: "Invalid election ID" });
    }

    // Use advanced fraud detection
    const fraudCases = await VotingAudit.detectAdvancedFraud(electionId);
    const networkFraud = await VotingAudit.detectNetworkFraud(electionId);
    const temporalAnomalies = await VotingAudit.detectTemporalAnomalies(electionId);
    
    res.json({
      message: "Advanced fraud detection completed",
      electionId: electionId,
      userBasedFraud: fraudCases,
      networkBasedFraud: networkFraud,
      temporalAnomalies: temporalAnomalies,
      summary: {
        totalSuspiciousUsers: fraudCases.length,
        totalSuspiciousNetworks: networkFraud.length,
        totalAnomalousPeriods: temporalAnomalies.length,
        overallRiskLevel: this.calculateOverallRisk(fraudCases, networkFraud, temporalAnomalies)
      },
      recommendations: this.generateFraudRecommendations(fraudCases, networkFraud, temporalAnomalies)
    });

  } catch (error) {
    console.error("detectFraud error:", error);
    res.status(500).json({ 
      error: "Server error during advanced fraud detection",
      details: error.message 
    });
  }
}

/**
 * Calculate overall risk level
 */
function calculateOverallRisk(userFraud, networkFraud, temporalAnomalies) {
  const totalCases = userFraud.length + networkFraud.length + temporalAnomalies.length;
  
  if (totalCases === 0) return 'low';
  if (totalCases <= 5) return 'medium';
  if (totalCases <= 15) return 'high';
  return 'critical';
}

/**
 * Generate fraud recommendations
 */
function generateFraudRecommendations(userFraud, networkFraud, temporalAnomalies) {
  const recommendations = [];
  
  if (userFraud.length > 0) {
    recommendations.push({
      type: 'user_investigation',
      priority: 'high',
      message: `${userFraud.length} users showing suspicious voting patterns`,
      action: 'Review user accounts and voting history'
    });
  }
  
  if (networkFraud.length > 0) {
    recommendations.push({
      type: 'network_analysis',
      priority: 'medium',
      message: `${networkFraud.length} networks showing automated voting patterns`,
      action: 'Investigate IP ranges and potential bot networks'
    });
  }
  
  if (temporalAnomalies.length > 0) {
    recommendations.push({
      type: 'temporal_review',
      priority: 'low',
      message: `${temporalAnomalies.length} time periods with unusual voting activity`,
      action: 'Review voting logs during anomalous periods'
    });
  }
  
  return recommendations;
}

export async function verifyElectionResults(req, res) {
  try {
    const { electionId } = req.params;
    
    if (!electionId || !mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({ error: "Invalid election ID" });
    }

    const verificationResults = await VotingAudit.verifyElectionResults(electionId);
    
    res.json({
      message: "Election results verification completed",
      electionId: electionId,
      verificationResults: verificationResults,
      summary: {
        totalCandidates: verificationResults.length,
        totalVotes: verificationResults.reduce((sum, c) => sum + c.totalVotes, 0),
        uniqueVoters: verificationResults.reduce((sum, c) => sum + c.uniqueVoterCount, 0),
        votingPeriod: {
          start: verificationResults.length > 0 ? Math.min(...verificationResults.map(r => r.votingTimespan)) : null,
          end: verificationResults.length > 0 ? Math.max(...verificationResults.map(r => r.votingTimespanEnd)) : null
        }
      }
    });

  } catch (error) {
    console.error("verifyElectionResults error:", error);
    res.status(500).json({ 
      error: "Server error during election verification",
      details: error.message 
    });
  }
}

export async function getAdminAuditReport(req, res) {
  try {
    const { 
      startDate, 
      endDate, 
      deletedBy,
      page = 1, 
      limit = 50 
    } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (deletedBy) filters.deletedBy = deletedBy;

    // Get summary report
    const summaryReport = await VotingAudit.getAdminAuditReport(filters);
    
    // Get detailed audit records with pagination
    const matchStage = {};
    if (filters.startDate) {
      matchStage.deletedAt = { $gte: new Date(filters.startDate) };
    }
    if (filters.endDate) {
      matchStage.deletedAt = { ...matchStage.deletedAt, $lte: new Date(filters.endDate) };
    }
    if (filters.deletedBy) {
      matchStage.deletedBy = filters.deletedBy;
    }

    const detailedRecords = await VotingAudit.find(matchStage)
      .sort({ deletedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const totalCount = await VotingAudit.countDocuments(matchStage);

    res.json({
      message: "Admin audit report generated",
      summary: summaryReport[0] || {
        totalDeletedUsers: 0,
        totalVotesPreserved: 0,
        deletionReasons: [],
        fraudCasesDetected: 0
      },
      detailedRecords: detailedRecords,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalRecords: totalCount,
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      },
      filters: filters
    });

  } catch (error) {
    console.error("getAdminAuditReport error:", error);
    res.status(500).json({ 
      error: "Server error generating audit report",
      details: error.message 
    });
  }
}

export async function getUserVotingHistory(req, res) {
  try {
    const { userId } = req.params;
    
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const userAuditRecord = await VotingAudit.findOne({ userId })
      .sort({ deletedAt: -1 });

    if (!userAuditRecord) {
      return res.status(404).json({ 
        error: "No voting history found for this user" 
      });
    }

    res.json({
      message: "User voting history retrieved",
      userId: userId,
      originalUserInfo: userAuditRecord.originalUserInfo,
      deletedAt: userAuditRecord.deletedAt,
      deletedBy: userAuditRecord.deletedBy,
      votingHistory: userAuditRecord.votingHistory,
      auditMetadata: userAuditRecord.auditMetadata,
      fraudAnalysis: {
        totalFraudFlags: userAuditRecord.auditMetadata.fraudFlags?.length || 0,
        fraudFlags: userAuditRecord.auditMetadata.fraudFlags || [],
        riskLevel: this.calculateRiskLevel(userAuditRecord.auditMetadata.fraudFlags || [])
      }
    });

  } catch (error) {
    console.error("getUserVotingHistory error:", error);
    res.status(500).json({ 
      error: "Server error retrieving user voting history",
      details: error.message 
    });
  }
}

/**
 * Calculate risk level based on fraud flags
 * @param {Array} fraudFlags - Array of fraud flags
 * @returns {String} - Risk level
 */
function calculateRiskLevel(fraudFlags) {
  if (fraudFlags.length === 0) return 'low';
  
  const highSeverityFlags = fraudFlags.filter(f => f.severity === 'high' || f.severity === 'critical');
  const mediumSeverityFlags = fraudFlags.filter(f => f.severity === 'medium');
  
  if (highSeverityFlags.length > 0) return 'high';
  if (mediumSeverityFlags.length > 2) return 'medium';
  if (fraudFlags.length > 0) return 'low';
  
  return 'low';
}

export async function getElectionAuditSummary(req, res) {
  try {
    const { electionId } = req.params;
    
    if (!electionId || !mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({ error: "Invalid election ID" });
    }

    // Get all audit records for this election
    const electionAudits = await VotingAudit.find({
      'votingHistory.electionId': electionId
    }).select('userId originalUserInfo deletedAt deletedBy votingHistory auditMetadata');

    // Analyze the data
    const totalVoters = electionAudits.length;
    const totalVotes = electionAudits.reduce((sum, audit) => 
      sum + (audit.votingHistory?.filter(v => v.electionId.toString() === electionId).length || 0), 0
    );

    const fraudCases = electionAudits.filter(audit => 
      audit.auditMetadata?.fraudFlags && audit.auditMetadata.fraudFlags.length > 0
    );

    const riskDistribution = {
      low: electionAudits.filter(a => calculateRiskLevel(a.auditMetadata?.fraudFlags || []) === 'low').length,
      medium: electionAudits.filter(a => calculateRiskLevel(a.auditMetadata?.fraudFlags || []) === 'medium').length,
      high: electionAudits.filter(a => calculateRiskLevel(a.auditMetadata?.fraudFlags || []) === 'high').length
    };

    res.json({
      message: "Election audit summary generated",
      electionId: electionId,
      summary: {
        totalVoters,
        totalVotes,
        fraudCasesDetected: fraudCases.length,
        fraudRate: totalVoters > 0 ? (fraudCases.length / totalVoters * 100).toFixed(2) : 0,
        riskDistribution,
        integrityScore: Math.max(0, 100 - (fraudCases.length / totalVoters * 100)).toFixed(2)
      },
      detailedAnalysis: {
        votingPatterns: electionAudits.map(audit => audit.auditMetadata?.votingPattern).filter(Boolean),
        commonFraudTypes: fraudCases.flatMap(audit => audit.auditMetadata.fraudFlags.map(f => f.type)),
        deletedUsersOverview: electionAudits.map(audit => ({
          userId: audit.userId,
          originalName: audit.originalUserInfo?.name,
          deletedAt: audit.deletedAt,
          deletedBy: audit.deletedBy
        }))
      }
    });

  } catch (error) {
    console.error("getElectionAuditSummary error:", error);
    res.status(500).json({ 
      error: "Server error generating election audit summary",
      details: error.message 
    });
  }
}
