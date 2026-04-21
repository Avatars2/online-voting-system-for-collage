import mongoose from 'mongoose';
import Vote from '../models/Vote.js';
import Candidate from '../models/Candidate.js';
import Election from '../models/Election.js';
import User from '../models/User.js';

/**
 * Vote Controller for managing individual votes
 */

export async function castVote(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { electionId, candidateId } = req.body;
    const userId = req.user.id;
    
    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(electionId) || !mongoose.Types.ObjectId.isValid(candidateId)) {
      return res.status(400).json({ error: "Invalid election or candidate ID" });
    }
    
    // Check if election is active
    const election = await Election.findById(electionId).session(session);
    if (!election) {
      return res.status(404).json({ error: "Election not found" });
    }
    
    const now = new Date();
    if (now < election.startDate) {
      return res.status(400).json({ error: "Election has not started yet" });
    }
    if (now > election.endDate) {
      return res.status(400).json({ error: "Election has ended" });
    }
    
    // Check if candidate exists and belongs to this election
    const candidate = await Candidate.findOne({ 
      _id: candidateId, 
      election: electionId 
    }).session(session);
    
    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found in this election" });
    }
    
    // Check if user has already voted
    const existingVote = await Vote.findOne({ 
      userId, 
      electionId 
    }).session(session);
    
    if (existingVote) {
      return res.status(400).json({ error: "You have already voted in this election" });
    }
    
    // Prepare vote data
    const voteData = {
      userId,
      electionId,
      candidateId,
      votedAt: new Date(),
      voteMetadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        votingMethod: 'web',
        sessionDuration: Math.floor(Math.random() * 300) + 60 // Mock data
      }
    };
    
    // Cast the vote using the model method
    const vote = await Vote.castVote(voteData);
    
    await session.commitTransaction();
    
    res.status(201).json({
      message: "Vote cast successfully",
      vote: {
        id: vote._id,
        electionId: vote.electionId,
        candidateId: vote.candidateId,
        candidateName: candidate.name,
        votedAt: vote.votedAt
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error("castVote error:", error);
    res.status(500).json({ 
      error: "Server error while casting vote",
      details: error.message 
    });
  } finally {
    session.endSession();
  }
}

export async function recountElection(req, res) {
  try {
    const { electionId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({ error: "Invalid election ID" });
    }
    
    // Perform recount
    const recountResult = await Vote.recountElection(electionId);
    
    res.json({
      message: "Election recount completed successfully",
      recountResult: {
        electionId: recountResult.electionId,
        totalVotes: recountResult.totalVotes,
        voteCounts: recountResult.voteCounts,
        candidatesUpdated: recountResult.candidatesUpdated,
        recountedAt: new Date()
      }
    });
    
  } catch (error) {
    console.error("recountElection error:", error);
    res.status(500).json({ 
      error: "Server error during recount",
      details: error.message 
    });
  }
}

export async function getElectionVotes(req, res) {
  try {
    const { electionId } = req.params;
    const { 
      page = 1, 
      limit = 50, 
      status = 'all', // 'all', 'verified', 'disputed'
      candidateId 
    } = req.query;
    
    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({ error: "Invalid election ID" });
    }
    
    // Build query
    const query = { electionId: new mongoose.Types.ObjectId(electionId) };
    
    if (status === 'verified') {
      query['voteStatus.isVerified'] = true;
      query['voteStatus.isDisputed'] = false;
    } else if (status === 'disputed') {
      query['voteStatus.isDisputed'] = true;
    }
    
    if (candidateId && mongoose.Types.ObjectId.isValid(candidateId)) {
      query.candidateId = new mongoose.Types.ObjectId(candidateId);
    }
    
    // Get votes with pagination
    const votes = await Vote.find(query)
      .populate('userId', 'name email studentId')
      .populate('candidateId', 'name position')
      .sort({ votedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');
    
    const totalCount = await Vote.countDocuments(query);
    
    // Get statistics
    const stats = await Vote.aggregate([
      { $match: { electionId: new mongoose.Types.ObjectId(electionId) } },
      {
        $group: {
          _id: null,
          totalVotes: { $sum: 1 },
          verifiedVotes: {
            $sum: { $cond: [{ $eq: ['$voteStatus.isVerified', true] }, 1, 0] }
          },
          disputedVotes: {
            $sum: { $cond: [{ $eq: ['$voteStatus.isDisputed', true] }, 1, 0] }
          },
          uniqueVoters: { $addToSet: '$userId' }
        }
      },
      {
        $addFields: {
          uniqueVoterCount: { $size: '$uniqueVoters' }
        }
      }
    ]);
    
    res.json({
      message: "Election votes retrieved successfully",
      votes: votes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalRecords: totalCount,
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      },
      statistics: stats[0] || {
        totalVotes: 0,
        verifiedVotes: 0,
        disputedVotes: 0,
        uniqueVoterCount: 0
      },
      filters: {
        status,
        candidateId
      }
    });
    
  } catch (error) {
    console.error("getElectionVotes error:", error);
    res.status(500).json({ 
      error: "Server error retrieving election votes",
      details: error.message 
    });
  }
}

export async function disputeVote(req, res) {
  try {
    const { voteId } = req.params;
    const { reason } = req.body;
    const disputedBy = req.user.id;
    
    if (!mongoose.Types.ObjectId.isValid(voteId)) {
      return res.status(400).json({ error: "Invalid vote ID" });
    }
    
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: "Dispute reason is required" });
    }
    
    const vote = await Vote.findById(voteId);
    if (!vote) {
      return res.status(404).json({ error: "Vote not found" });
    }
    
    if (vote.voteStatus.isDisputed) {
      return res.status(400).json({ error: "Vote is already disputed" });
    }
    
    // Dispute the vote
    await vote.disputeVote(reason, disputedBy);
    
    res.json({
      message: "Vote disputed successfully",
      vote: {
        id: vote._id,
        electionId: vote.electionId,
        candidateId: vote.candidateId,
        disputeReason: reason,
        disputedAt: new Date()
      }
    });
    
  } catch (error) {
    console.error("disputeVote error:", error);
    res.status(500).json({ 
      error: "Server error disputing vote",
      details: error.message 
    });
  }
}

export async function resolveDispute(req, res) {
  try {
    const { voteId } = req.params;
    const { resolution } = req.body;
    const resolvedBy = req.user.id;
    
    if (!mongoose.Types.ObjectId.isValid(voteId)) {
      return res.status(400).json({ error: "Invalid vote ID" });
    }
    
    if (!resolution || resolution.trim().length === 0) {
      return res.status(400).json({ error: "Resolution is required" });
    }
    
    const vote = await Vote.findById(voteId);
    if (!vote) {
      return res.status(404).json({ error: "Vote not found" });
    }
    
    if (!vote.voteStatus.isDisputed) {
      return res.status(400).json({ error: "Vote is not disputed" });
    }
    
    // Resolve the dispute
    const resolvedVote = await vote.resolveDispute(resolution, resolvedBy);
    
    res.json({
      message: "Dispute resolved successfully",
      vote: {
        id: resolvedVote._id,
        electionId: resolvedVote.electionId,
        candidateId: resolvedVote.candidateId,
        disputeResolution: resolution,
        resolvedAt: resolvedVote.voteStatus.verifiedAt
      }
    });
    
  } catch (error) {
    console.error("resolveDispute error:", error);
    res.status(500).json({ 
      error: "Server error resolving dispute",
      details: error.message 
    });
  }
}

export async function verifyVote(req, res) {
  try {
    const { voteId } = req.params;
    const verifiedBy = req.user.id;
    
    if (!mongoose.Types.ObjectId.isValid(voteId)) {
      return res.status(400).json({ error: "Invalid vote ID" });
    }
    
    const vote = await Vote.findById(voteId);
    if (!vote) {
      return res.status(404).json({ error: "Vote not found" });
    }
    
    if (vote.voteStatus.isVerified) {
      return res.status(400).json({ error: "Vote is already verified" });
    }
    
    // Verify the vote
    const verifiedVote = await vote.verifyVote(verifiedBy);
    
    res.json({
      message: "Vote verified successfully",
      vote: {
        id: verifiedVote._id,
        electionId: verifiedVote.electionId,
        candidateId: verifiedVote.candidateId,
        verifiedAt: verifiedVote.voteStatus.verifiedAt
      }
    });
    
  } catch (error) {
    console.error("verifyVote error:", error);
    res.status(500).json({ 
      error: "Server error verifying vote",
      details: error.message 
    });
  }
}

export async function getVoteAuditTrail(req, res) {
  try {
    const { voteId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(voteId)) {
      return res.status(400).json({ error: "Invalid vote ID" });
    }
    
    const vote = await Vote.findById(voteId)
      .populate('auditTrail.performedBy', 'name email role')
      .populate('userId', 'name email studentId')
      .populate('candidateId', 'name position');
    
    if (!vote) {
      return res.status(404).json({ error: "Vote not found" });
    }
    
    res.json({
      message: "Vote audit trail retrieved successfully",
      vote: {
        id: vote._id,
        userId: vote.userId,
        candidateId: vote.candidateId,
        electionId: vote.electionId,
        votedAt: vote.votedAt,
        voteStatus: vote.voteStatus,
        voteMetadata: vote.voteMetadata,
        fraudFlags: vote.fraudFlags,
        auditTrail: vote.auditTrail
      }
    });
    
  } catch (error) {
    console.error("getVoteAuditTrail error:", error);
    res.status(500).json({ 
      error: "Server error retrieving vote audit trail",
      details: error.message 
    });
  }
}

export async function getVoteStatistics(req, res) {
  try {
    const { electionId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({ error: "Invalid election ID" });
    }
    
    // Get comprehensive vote statistics
    const statistics = await Vote.aggregate([
      { $match: { electionId: new mongoose.Types.ObjectId(electionId) } },
      {
        $group: {
          _id: null,
          totalVotes: { $sum: 1 },
          verifiedVotes: {
            $sum: { $cond: [{ $eq: ['$voteStatus.isVerified', true] }, 1, 0] }
          },
          disputedVotes: {
            $sum: { $cond: [{ $eq: ['$voteStatus.isDisputed', true] }, 1, 0] }
          },
          resolvedVotes: {
            $sum: { $cond: [{ $eq: ['$voteStatus.disputeResolved', true] }, 1, 0] }
          },
          uniqueVoters: { $addToSet: '$userId' },
          votingMethods: {
            $push: '$voteMetadata.votingMethod'
          },
          fraudFlagsCount: {
            $sum: { $size: { $ifNull: ['$fraudFlags', []] } }
          }
        }
      },
      {
        $addFields: {
          uniqueVoterCount: { $size: '$uniqueVoters' },
          votingMethodBreakdown: {
            $reduce: {
              input: '$votingMethods',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  {
                    $arrayToObject: [
                      [{ k: ['$$this'], v: { $add: [{ $ifNull: [{ $lookup: { input: '$$value', from: '$$this', default: 0 } }, 0] }, 1] } }]
                    ]
                  }
                ]
              }
            }
          },
          verificationRate: {
            $multiply: [
              { $divide: ['$verifiedVotes', '$totalVotes'] },
              100
            ]
          },
          disputeRate: {
            $multiply: [
              { $divide: ['$disputedVotes', '$totalVotes'] },
              100
            ]
          }
        }
      }
    ]);
    
    // Get vote timeline
    const timeline = await Vote.aggregate([
      { $match: { electionId: new mongoose.Types.ObjectId(electionId) } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$votedAt' } },
            hour: { $hour: '$votedAt' }
          },
          votes: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1, '_id.hour': 1 } }
    ]);
    
    res.json({
      message: "Vote statistics retrieved successfully",
      statistics: statistics[0] || {
        totalVotes: 0,
        verifiedVotes: 0,
        disputedVotes: 0,
        resolvedVotes: 0,
        uniqueVoterCount: 0,
        verificationRate: 0,
        disputeRate: 0,
        votingMethodBreakdown: {},
        fraudFlagsCount: 0
      },
      timeline: timeline
    });
    
  } catch (error) {
    console.error("getVoteStatistics error:", error);
    res.status(500).json({ 
      error: "Server error retrieving vote statistics",
      details: error.message 
    });
  }
}
