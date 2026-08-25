import User from '../models/User.js';
import { listAuditLogs, AUDIT_CATEGORIES } from '../utils/auditLog.js';

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
