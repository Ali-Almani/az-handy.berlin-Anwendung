import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getNote, saveNote, getHistory } from '../controllers/dashboard.controller.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/note', getNote);
router.put('/note', saveNote);
router.get('/note/history', getHistory);

export default router;
