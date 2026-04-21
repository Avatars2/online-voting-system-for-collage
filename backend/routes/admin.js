import express from "express";
import { protect, authorize } from "../middleware/roleAuth.js";
import * as adminCtrl from "../controllers/adminController.js";
import { registerHOD, getAllHODs, registerTeacher, getAllTeachers } from "../controllers/hodTeacherController.js";
import { softDeleteStudent, softDeleteHOD, softDeleteTeacher, checkSoftDeleteSafety, getSoftDeletedUsers, restoreUser } from "../controllers/softDeleteController.js";
import { detectFraud, verifyElectionResults, getAdminAuditReport, getUserVotingHistory, getElectionAuditSummary } from "../controllers/auditController.js";
import { recountElection, getElectionVotes, disputeVote, resolveDispute, verifyVote, getVoteAuditTrail, getVoteStatistics } from "../controllers/voteController.js";

const router = express.Router();

router.post("/register", adminCtrl.registerAdmin);

router.use(protect);
router.use(authorize("admin"));

router.get("/stats", adminCtrl.getDashboardStats);

// HOD Management
router.post("/register-hod", registerHOD);
router.get("/hods", getAllHODs);
router.delete("/hods/:id", softDeleteHOD);
router.get("/hods/:id/safety-check", checkSoftDeleteSafety);

// Teacher Management
router.post("/register-teacher", registerTeacher);
router.get("/teachers", getAllTeachers);
router.delete("/teachers/:id", softDeleteTeacher);
router.get("/teachers/:id/safety-check", checkSoftDeleteSafety);

// Department Management
router.get("/departments", adminCtrl.listDepartments);
router.post("/departments", adminCtrl.createDepartment);
router.post("/department", adminCtrl.createDepartment);
router.get("/departments/:id", adminCtrl.getDepartment);
router.put("/departments/:id", adminCtrl.updateDepartment);
router.delete("/departments/:id", adminCtrl.deleteDepartment);

// Class Management
router.get("/classes", adminCtrl.listClasses);
router.get("/classes/available", adminCtrl.listAvailableClasses);
router.post("/classes", adminCtrl.createClass);
router.post("/class", adminCtrl.createClass);
router.get("/classes/:id", adminCtrl.getClass);
router.put("/classes/:id", adminCtrl.updateClass);
router.delete("/classes/:id", adminCtrl.deleteClass);

// Student Management
router.get("/students", adminCtrl.listStudents);
router.post("/students", adminCtrl.registerStudent);
router.post("/student-register", adminCtrl.registerStudent);
router.put("/students/:id", adminCtrl.updateStudent);
router.delete("/students/:id", softDeleteStudent);
router.get("/students/:id/safety-check", checkSoftDeleteSafety);

// Soft Delete Management
router.get("/soft-deleted-users", getSoftDeletedUsers);
router.post("/restore-user/:id", restoreUser);

// Notice Management
router.get("/notices", adminCtrl.listNotices);
router.post("/notices", adminCtrl.createNotice);
router.post("/notice", adminCtrl.createNotice);

// Election Management
router.get("/elections", adminCtrl.listElections);
router.post("/elections", adminCtrl.createElection);
router.put("/elections/:id", adminCtrl.updateElection);
router.delete("/elections/:id", adminCtrl.deleteElection);
router.post("/elections/:id/candidates", adminCtrl.addCandidate);
router.delete("/elections/:id/candidates/:candidateId", adminCtrl.deleteCandidate);

// Results
router.get("/results/:electionId", adminCtrl.electionResults);

// Vote Management
router.get("/votes/election/:electionId", getElectionVotes);
router.get("/votes/election/:electionId/statistics", getVoteStatistics);
router.post("/votes/election/:electionId/recount", recountElection);
router.post("/votes/:voteId/dispute", disputeVote);
router.post("/votes/:voteId/resolve", resolveDispute);
router.post("/votes/:voteId/verify", verifyVote);
router.get("/votes/:voteId/audit", getVoteAuditTrail);

// Audit & Fraud Detection
router.get("/audit/fraud/:electionId", detectFraud);
router.get("/audit/verify/:electionId", verifyElectionResults);
router.get("/audit/report", getAdminAuditReport);
router.get("/audit/user/:userId", getUserVotingHistory);
router.get("/audit/election/:electionId", getElectionAuditSummary);

export default router;
