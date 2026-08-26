import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  listAuditLogsHandler,
  exportAuditLogsHandler,
  listCriticalNotificationsHandler,
  markCriticalNotificationReadHandler
} from '../controllers/auditLog.controller.js';

const router = express.Router();

router.get('/', authenticateToken, listAuditLogsHandler);
router.get('/export', authenticateToken, exportAuditLogsHandler);
router.get('/notifications', authenticateToken, listCriticalNotificationsHandler);
router.patch('/notifications/:id/read', authenticateToken, markCriticalNotificationReadHandler);

export default router;
