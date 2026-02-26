import express from 'express';
import { login, logout, verifyToken, changePassword, updateMe } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/verify', protect, verifyToken);
router.post('/change-password', protect, changePassword);
router.put('/me', protect, updateMe);

export default router;
