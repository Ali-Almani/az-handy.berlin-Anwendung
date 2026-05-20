import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { forbidPartnerRole } from '../middleware/forbidPartnerRole.js';
import {
  getImeisData,
  saveImeisData,
  updateHistoryAction,
  sendImeiReminder,
  getMyImeiReminders,
  markImeiReminderRead,
  notifyReminderResponse,
  getReminderResponseNotifications,
  markReminderResponseNotificationRead,
  createExtraCopyRequest,
  getExtraCopyRequests,
  approveExtraCopyRequest,
  rejectExtraCopyRequest,
  getExtraCopyNotifications,
  markExtraCopyNotificationRead,
  approveSonderImeis
} from '../controllers/imeis.controller.js';

const router = express.Router();

router.use(authenticateToken);
router.use(forbidPartnerRole);

router.get('/data', getImeisData);
router.put('/data', saveImeisData);
router.patch('/data/history-action', updateHistoryAction);
router.post('/reminder', sendImeiReminder);
router.get('/reminders', getMyImeiReminders);
router.patch('/reminders/:id/read', markImeiReminderRead);
router.post('/reminder-response', notifyReminderResponse);
router.get('/reminder-response-notifications', getReminderResponseNotifications);
router.patch('/reminder-response-notifications/:id/read', markReminderResponseNotificationRead);
router.post('/extra-copy-request', createExtraCopyRequest);
router.get('/extra-copy-requests', getExtraCopyRequests);
router.post('/extra-copy-request/:id/approve', approveExtraCopyRequest);
router.post('/extra-copy-request/:id/reject', rejectExtraCopyRequest);
router.get('/extra-copy-notifications', getExtraCopyNotifications);
router.patch('/extra-copy-notifications/:id/read', markExtraCopyNotificationRead);
router.post('/sonder-approve', approveSonderImeis);

export default router;
