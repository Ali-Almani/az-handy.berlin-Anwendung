import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getImeisData, saveImeisData, updateHistoryAction } from '../controllers/imeis.controller.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/data', getImeisData);
router.put('/data', saveImeisData);
router.patch('/data/history-action', updateHistoryAction);

export default router;
