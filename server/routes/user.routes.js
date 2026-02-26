import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getProfile, updateProfile } from '../controllers/user.controller.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

export default router;
