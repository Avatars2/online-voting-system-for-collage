import express from "express";
import { protect, authorize } from "../middleware/roleAuth.js";
import {
  castVote,
  recountElection,
  getElectionVotes,
  disputeVote,
  resolveDispute,
  verifyVote,
  getVoteAuditTrail,
  getVoteStatistics
} from "../controllers/voteController.js";

const router = express.Router();

// Public routes (for voting)
router.post("/cast", protect, castVote);

// Admin routes for vote management
router.use(protect);
router.use(authorize("admin"));

// Vote management
router.get("/election/:electionId", getElectionVotes);
router.get("/election/:electionId/statistics", getVoteStatistics);
router.post("/election/:electionId/recount", recountElection);

// Dispute management
router.post("/:voteId/dispute", disputeVote);
router.post("/:voteId/resolve", resolveDispute);
router.post("/:voteId/verify", verifyVote);

// Audit trails
router.get("/:voteId/audit", getVoteAuditTrail);

export default router;
