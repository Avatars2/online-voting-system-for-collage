import mongoose from 'mongoose';
import User from '../models/User.js';
import Election from '../models/Election.js';
import Candidate from '../models/Candidate.js';
import Department from '../models/Department.js';
import ClassModel from '../models/Class.js';

export async function me(req, res){
  try {
    // Get user with populated department and class
    const user = await User.findById(req.user._id).populate('department class');
    const userObj = user?.toObject ? user.toObject() : user;
    const { password, ...safe } = userObj || {};
    res.json(safe);
  } catch (err) {
    console.error('me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function listElections(req, res){
  try {
    const user = await User.findById(req.user._id).populate('votedElections');
    const deptId = user?.department ? String(user.department) : null;
    const classId = user?.class ? String(user.class) : null;

    const or = [{ level: { $in: [null, "global"] } }, { level: { $exists: false } }];
    if (deptId) or.push({ level: "department", department: deptId });
    if (classId) or.push({ level: "class", class: classId });

    const elections = await Election.find({ $or: or })
      .sort({ createdAt: -1 })
      .populate("department class");
    
    // Add candidates and voted status to each election
    const votedElectionIds = (user.votedElections || []).map(e => e._id.toString());
    
    const items = await Promise.all(
      elections.map(async (e) => {
        const candidates = await Candidate.find({ election: e._id })
          .populate("student", "name email studentId");
        
        return {
          ...e.toObject(),
          candidates: candidates,
          candidateCount: candidates.length,
          hasVoted: votedElectionIds.includes(e._id.toString())
        };
      })
    );
    
    res.json(items);
  } catch (err) {
    console.error('listElections error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getElectionCandidates(req, res){
  try {
    const { electionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(electionId)) return res.status(400).json({ error: 'Invalid election ID' });
    const election = await Election.findById(electionId);
    if (!election) return res.status(404).json({ error: 'Election not found' });

    const user = req.user;
    const deptId = user?.department ? String(user.department) : null;
    const classId = user?.class ? String(user.class) : null;

    const eligible =
      !election.level ||
      election.level === "global" ||
      (election.level === "department" && deptId && String(election.department) === deptId) ||
      (election.level === "class" && classId && String(election.class) === classId);

    if (!eligible) return res.status(403).json({ error: "You are not eligible for this election" });

    const candidates = await Candidate.find({ election: electionId })
      .sort({ votes: -1 })
      .populate("student", "name email studentId department class");

    // Calculate voting statistics for students
    let totalVotes = 0;
    let studentsWhoVoted = 0;
    let studentsWhoDidNotVote = 0;

    console.log("Student API - Calculating voting stats for election:", electionId);
    console.log("Election level:", election.level);

    if (election.level === "global") {
      // For global elections, count all students
      const allStudents = await User.countDocuments({ role: "student" });
      const studentsWithVotes = await User.countDocuments({ 
        role: "student", 
        votedElections: { $in: [new mongoose.Types.ObjectId(electionId)] }
      });
      
      totalVotes = allStudents; // Total eligible students, not just votes received
      studentsWhoVoted = studentsWithVotes;
      studentsWhoDidNotVote = allStudents - studentsWithVotes;
      
      console.log("Student API - Global election stats:", { allStudents, studentsWithVotes, totalVotes });
    } else if (election.level === "department") {
      // For department elections, count students in that department
      const allStudents = await User.countDocuments({ 
        role: "student", 
        $or: [
          { department: election.department },
          { assignedDepartment: election.department }
        ]
      });
      const studentsWithVotes = await User.countDocuments({ 
        role: "student",
        $or: [
          { department: election.department },
          { assignedDepartment: election.department }
        ],
        votedElections: { $in: [new mongoose.Types.ObjectId(electionId)] }
      });
      
      totalVotes = allStudents; // Total eligible students, not just votes received
      studentsWhoVoted = studentsWithVotes;
      studentsWhoDidNotVote = allStudents - studentsWithVotes;
      
      console.log("Student API - Department election stats:", { allStudents, studentsWithVotes, totalVotes, deptId: election.department });
    } else if (election.level === "class") {
      // For class elections, count students in that class
      const allStudents = await User.countDocuments({ 
        role: "student", 
        $or: [
          { class: election.class },
          { assignedClass: election.class }
        ]
      });
      const studentsWithVotes = await User.countDocuments({ 
        role: "student",
        $or: [
          { class: election.class },
          { assignedClass: election.class }
        ],
        votedElections: { $in: [new mongoose.Types.ObjectId(electionId)] }
      });
      
      totalVotes = allStudents; // Total eligible students, not just votes received
      studentsWhoVoted = studentsWithVotes;
      studentsWhoDidNotVote = allStudents - studentsWithVotes;
      
      console.log("Student API - Class election stats:", { allStudents, studentsWithVotes, totalVotes, classId: election.class });
    }

    res.json({ 
      election, 
      candidates,
      votingStats: {
        totalVotes,
        studentsWhoVoted,
        studentsWhoDidNotVote
      }
    });
  } catch (err) {
    console.error('getElectionCandidates error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function vote(req, res){
  try {
    const { electionId, candidateId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(electionId) || !mongoose.Types.ObjectId.isValid(candidateId)) {
      return res.status(400).json({ error: 'Invalid election or candidate ID' });
    }
    const userId = req.userId || req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const election = await Election.findById(electionId);
    if (!election) return res.status(404).json({ error: 'Election not found' });

    const deptId = req.user?.department ? String(req.user.department) : null;
    const classId = req.user?.class ? String(req.user.class) : null;
    const eligible =
      !election.level ||
      election.level === "global" ||
      (election.level === "department" && deptId && String(election.department) === deptId) ||
      (election.level === "class" && classId && String(election.class) === classId);

    if (!eligible) return res.status(403).json({ error: "You are not eligible for this election" });

    const now = new Date();
    if (election.startDate && new Date(election.startDate) > now) {
      return res.status(400).json({ error: 'Election has not started yet' });
    }
    if (election.endDate && new Date(election.endDate) < now) {
      return res.status(400).json({ error: 'Election has ended' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const votedIds = (user.votedElections || []).map(id => id?.toString?.() || id);
    if (votedIds.includes(electionId)) {
      return res.status(400).json({ error: 'You have already voted in this election' });
    }

    const candidate = await Candidate.findOne({ _id: candidateId, election: electionId });
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    candidate.votes = (candidate.votes || 0) + 1;
    await candidate.save();

    user.votedElections = user.votedElections || [];
    user.votedElections.push(electionId);
    await user.save();

    res.json({ ok: true, message: 'Vote recorded successfully' });
  } catch (err) {
    console.error('vote error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}


