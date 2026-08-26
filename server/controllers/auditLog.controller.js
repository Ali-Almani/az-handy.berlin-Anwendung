import User from '../models/User.js';
import {
  listAuditLogs,
  exportAuditLogsToCsv,
  listUnreadCriticalNotifications,
  markCriticalNotificationRead,
  markAllCriticalNotificationsRead,
  AUDIT_CATEGORIES,
  AUDIT_EXPORT_MAX_ROWS
} from '../utils/auditLog.js';

async function isAdminUser(userId) {
  if (!userId) return false;
  try {
    const u = await User.findByPk(userId);
    if (!u) return false;
    const role = String(u.role ?? u.get?.('role') ?? u.dataValues?.role ?? '').trim();
    return role === 'Administrator' || role === 'admin' || role.toLowerCase().includes('admin');
  } catch {
    return false;
  }
}

async function requireAdmin(req, res) {
  const ok = await isAdminUser(req.user?.userId ?? req.user?.id);
  if (!ok) {
    res.status(403).json({ success: false, message: 'Nur für Administratoren.' });
    return false;
  }
  return true;
}

export async function listAuditLogsHandler(req, res) {
  if (!(await requireAdmin(req, res))) return;

  const result = listAuditLogs({
    from: req.query.from,
    to: req.query.to,
    category: req.query.category,
    userId: req.query.userId,
    search: req.query.search,
    limit: req.query.limit,
    offset: req.query.offset
  });

  return res.json({
    success: true,
    ...result,
    categories: AUDIT_CATEGORIES
  });
}

export async function exportAuditLogsHandler(req, res) {
  if (!(await requireAdmin(req, res))) return;

  const csv = exportAuditLogsToCsv({
    from: req.query.from,
    to: req.query.to,
    category: req.query.category,
    userId: req.query.userId,
    search: req.query.search
  });

  const datePart = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="audit-log_${datePart}.csv"`);
  res.setHeader('X-Export-Max-Rows', String(AUDIT_EXPORT_MAX_ROWS));
  return res.send(csv);
}

export async function listCriticalNotificationsHandler(req, res) {
  if (!(await requireAdmin(req, res))) return;

  return res.json({
    success: true,
    notifications: listUnreadCriticalNotifications()
  });
}

export async function markCriticalNotificationReadHandler(req, res) {
  if (!(await requireAdmin(req, res))) return;

  const { id } = req.params;
  if (id === 'all') {
    markAllCriticalNotificationsRead();
    return res.json({ success: true });
  }

  const ok = markCriticalNotificationRead(id);
  if (!ok) {
    return res.status(404).json({ success: false, message: 'Benachrichtigung nicht gefunden.' });
  }
  return res.json({ success: true });
}
