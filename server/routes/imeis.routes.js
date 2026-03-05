import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getImeisData, saveImeisData, updateHistoryAction, sendImeiReminder, getMyImeiReminders, markImeiReminderRead } from '../controllers/imeis.controller.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/data', getImeisData);
router.put('/data', saveImeisData);
router.patch('/data/history-action', updateHistoryAction);
router.post('/reminder', sendImeiReminder);
router.get('/reminders', getMyImeiReminders);
router.patch('/reminders/:id/read', markImeiReminderRead);

export default router;
