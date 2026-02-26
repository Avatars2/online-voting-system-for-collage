
import express from 'express';
import { protect, authorizeRoles } from '../middleware/auth.js';
import * as studentCtrl from '../controllers/studentController.js';

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('student','admin'));

router.get('/me', studentCtrl.me);
router.get('/elections', studentCtrl.listElections);
router.get('/elections/:electionId/candidates', studentCtrl.getElectionCandidates);
router.post('/vote/:electionId/:candidateId', studentCtrl.vote);

export default router;


