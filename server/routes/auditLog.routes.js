import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { listAuditLogsHandler } from '../controllers/auditLog.controller.js';

const router = express.Router();

router.get('/', authenticateToken, listAuditLogsHandler);

export default router;
