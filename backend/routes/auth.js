import express from 'express';
import { login, logout, verifyToken, changePassword, updateMe, sendOTP, verifyOTP, resetPassword, forgotPassword, resetPasswordWithToken, unlockAccount, suspendAccount, getAccountStatus } from '../controllers/authController.js';
import { protect, authorize } from '../middleware/roleAuth.js';

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/verify', protect, verifyToken);
router.post('/change-password', protect, changePassword);
router.put('/me', protect, updateMe);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password-token', resetPasswordWithToken);
router.post('/reset-password', resetPassword);

// Account Management Routes (Admin only)
router.post('/unlock/:userId', protect, authorize('admin'), unlockAccount);
router.post('/suspend/:userId', protect, authorize('admin'), suspendAccount);
router.get('/status/:userId', protect, authorize('admin'), getAccountStatus);

export default router;
