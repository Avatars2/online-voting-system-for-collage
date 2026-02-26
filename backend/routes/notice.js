import express from 'express';
import Notice from '../models/Notice.js';

const router = express.Router();

// Public list - no auth required
router.get('/', async (req, res) => {
  try {
    const notices = await Notice.find().sort({ createdAt: -1 });
    res.json(notices);
  } catch (err) {
    console.error('list notices error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
