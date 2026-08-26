import { readJsonStore, updateJsonStore } from './jsonClusterStore.js';

export const AUDIT_LOG_FILE = 'audit-log.json';
export const AUDIT_NOTIFICATIONS_FILE = 'audit-log-notifications.json';
export const AUDIT_RETENTION_DAYS = 30;
export const AUDIT_EXPORT_MAX_ROWS = 5000;
export const AUDIT_NOTIFICATION_RETENTION_DAYS = 7;

export const AUDIT_CATEGORIES = [
  'auth',
  'user',
  'imei',
  'vorvertrag',
  'voucher',
  'excel',
  'dashboard'
];

/** Aktionen, die Admins per Socket + Notification-Liste informieren. */
export const CRITICAL_AUDIT_ACTIONS = new Set([
  'login.failed',
  'user.delete',
  'user.password.reset',
  'imei.delete_all',
  'imei.accepted_archive.delete',
  'vorvertrag.delete'
]);

const LOGIN_FAIL_NOTIFY_COOLDOWN_MS = 10 * 60 * 1000;
const loginFailNotifyAt = new Map();

const defaultStore = () => ({ entries: [] });
const defaultNotificationsStore = () => ({ notifications: [], nextId: 1 });

function newLogId() {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeCategory(value) {
  const v = String(value ?? '').trim().toLowerCase();
  return AUDIT_CATEGORIES.includes(v) ? v : 'dashboard';
}

function clientIp(req) {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (forwarded) {
    const first = String(forwarded).split(',')[0]?.trim();
    if (first) return first;
  }
  return String(req?.ip ?? req?.socket?.remoteAddress ?? '').trim() || null;
}

function actorFromReq(req, overrides = {}) {
  const u = req?.user || {};
  return {
    userId: String(overrides.userId ?? u.userId ?? u.id ?? '').trim() || null,
    userName: String(overrides.userName ?? u.name ?? u.userName ?? '').trim() || 'Unbekannt',
    userRole: String(overrides.userRole ?? u.role ?? '').trim() || null
  };
}

export function isCriticalAuditAction(action) {
  return CRITICAL_AUDIT_ACTIONS.has(String(action ?? '').trim());
}

function shouldNotifyCriticalAction(action, meta = {}) {
  if (!isCriticalAuditAction(action)) return false;
  if (action !== 'login.failed') return true;

  const key = String(meta.email ?? meta.targetEmail ?? 'unknown').toLowerCase();
  const now = Date.now();
  const last = loginFailNotifyAt.get(key) ?? 0;
  if (now - last < LOGIN_FAIL_NOTIFY_COOLDOWN_MS) return false;
  loginFailNotifyAt.set(key, now);
  return true;
}

function purgeNotificationsOlderThan(days, notifications = []) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return notifications.filter((n) => {
    const ts = Date.parse(n?.timestamp ?? '');
    return Number.isFinite(ts) && ts >= cutoff;
  });
}

function emitCriticalAuditEvent(req, entry, notificationPayload) {
  const io = req?.app?.get?.('io');
  if (!io) return;
  io.emit('auditLog:critical', {
    id: entry.id,
    timestamp: entry.timestamp,
    action: entry.action,
    category: entry.category,
    summary: entry.summary,
    userName: entry.userName,
    userRole: entry.userRole,
    notificationId: notificationPayload?.id ?? null
  });
}

function notifyCriticalAuditEvent(req, entry) {
  if (!shouldNotifyCriticalAction(entry.action, entry.meta)) return;

  let latestNotification = null;
  updateJsonStore(AUDIT_NOTIFICATIONS_FILE, defaultNotificationsStore(), (state) => {
    if (!Array.isArray(state.notifications)) state.notifications = [];
    const nextId = Number(state.nextId) || 1;
    latestNotification = {
      id: nextId,
      logId: entry.id,
      timestamp: entry.timestamp,
      category: entry.category,
      action: entry.action,
      summary: entry.summary,
      userName: entry.userName,
      userRole: entry.userRole,
      read: false
    };
    state.notifications.unshift(latestNotification);
    state.nextId = nextId + 1;
    state.notifications = purgeNotificationsOlderThan(
      AUDIT_NOTIFICATION_RETENTION_DAYS,
      state.notifications
    );
    if (state.notifications.length > 100) {
      state.notifications = state.notifications.slice(0, 100);
    }
  });

  emitCriticalAuditEvent(req, entry, latestNotification);
}

export function purgeOlderThan(days = AUDIT_RETENTION_DAYS, entries = []) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return entries.filter((e) => {
    const ts = Date.parse(e?.timestamp ?? '');
    return Number.isFinite(ts) && ts >= cutoff;
  });
}

/**
 * Schreibt einen Audit-Eintrag (fire-and-forget – Fehler nur in console).
 * @param {object|null} req – Express request (optional bei Login ohne Token)
 * @param {{ category, action, summary, meta?, userId?, userName?, userRole? }} payload
 */
export function writeAuditLog(req, payload = {}) {
  try {
    const category = normalizeCategory(payload.category);
    const action = String(payload.action ?? '').trim();
    const summary = String(payload.summary ?? '').trim();
    if (!action || !summary) return;

    const actor = actorFromReq(req, payload);
    const meta = payload.meta && typeof payload.meta === 'object' && !Array.isArray(payload.meta)
      ? payload.meta
      : {};
    const entry = {
      id: newLogId(),
      timestamp: new Date().toISOString(),
      category,
      action,
      userId: actor.userId,
      userName: actor.userName,
      userRole: actor.userRole,
      ip: clientIp(req),
      summary,
      meta
    };

    updateJsonStore(AUDIT_LOG_FILE, defaultStore(), (state) => {
      if (!Array.isArray(state.entries)) state.entries = [];
      state.entries.unshift(entry);
      state.entries = purgeOlderThan(AUDIT_RETENTION_DAYS, state.entries);
      if (state.entries.length > 5000) {
        state.entries = state.entries.slice(0, 5000);
      }
    });

    notifyCriticalAuditEvent(req, entry);
  } catch (err) {
    console.error('writeAuditLog:', err?.message || err);
  }
}

export function runAuditLogRetentionPurge() {
  try {
    updateJsonStore(AUDIT_LOG_FILE, defaultStore(), (state) => {
      if (!Array.isArray(state.entries)) {
        state.entries = [];
        return;
      }
      const before = state.entries.length;
      state.entries = purgeOlderThan(AUDIT_RETENTION_DAYS, state.entries);
      if (before !== state.entries.length) {
        console.log(`audit-log: ${before - state.entries.length} Einträge älter als ${AUDIT_RETENTION_DAYS} Tage entfernt`);
      }
    });
    updateJsonStore(AUDIT_NOTIFICATIONS_FILE, defaultNotificationsStore(), (state) => {
      if (!Array.isArray(state.notifications)) {
        state.notifications = [];
        return;
      }
      state.notifications = purgeNotificationsOlderThan(
        AUDIT_NOTIFICATION_RETENTION_DAYS,
        state.notifications
      );
    });
  } catch (err) {
    console.error('runAuditLogRetentionPurge:', err?.message || err);
  }
}

function parseDateStart(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const d = new Date(`${raw}T00:00:00.000Z`);
  return Number.isFinite(d.getTime()) ? d.getTime() : null;
}

function parseDateEnd(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const d = new Date(`${raw}T23:59:59.999Z`);
  return Number.isFinite(d.getTime()) ? d.getTime() : null;
}

function filterAuditLogs(options = {}) {
  const category = String(options.category ?? '').trim().toLowerCase();
  const userId = String(options.userId ?? '').trim();
  const search = String(options.search ?? '').trim().toLowerCase();
  const fromMs = parseDateStart(options.from);
  const toMs = parseDateEnd(options.to);

  const data = readJsonStore(AUDIT_LOG_FILE, defaultStore());
  let entries = Array.isArray(data.entries) ? [...data.entries] : [];

  if (category && AUDIT_CATEGORIES.includes(category)) {
    entries = entries.filter((e) => e.category === category);
  }
  if (userId) {
    entries = entries.filter((e) => String(e.userId ?? '') === userId);
  }
  if (fromMs != null) {
    entries = entries.filter((e) => Date.parse(e.timestamp) >= fromMs);
  }
  if (toMs != null) {
    entries = entries.filter((e) => Date.parse(e.timestamp) <= toMs);
  }
  if (search) {
    entries = entries.filter((e) => {
      const hay = [
        e.summary,
        e.action,
        e.userName,
        e.userRole,
        e.category
      ].map((x) => String(x ?? '').toLowerCase()).join(' ');
      return hay.includes(search);
    });
  }

  entries.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  return entries;
}

export function listAuditLogs(options = {}) {
  const limit = Math.min(Math.max(parseInt(String(options.limit ?? 50), 10) || 50, 1), 200);
  const offset = Math.max(parseInt(String(options.offset ?? 0), 10) || 0, 0);
  const filtered = filterAuditLogs(options);
  const total = filtered.length;
  const page = filtered.slice(offset, offset + limit);

  return { entries: page, total, limit, offset };
}

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function formatCsvTimestamp(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return String(iso);
  }
}

export function exportAuditLogsToCsv(options = {}) {
  const entries = filterAuditLogs(options).slice(0, AUDIT_EXPORT_MAX_ROWS);
  const headers = ['Zeit', 'Benutzer', 'Rolle', 'Kategorie', 'Aktion', 'Details', 'IP'];
  const rows = entries.map((entry) => [
    formatCsvTimestamp(entry.timestamp),
    entry.userName ?? '',
    entry.userRole ?? '',
    entry.category ?? '',
    entry.action ?? '',
    entry.summary ?? '',
    entry.ip ?? ''
  ]);
  const lines = [headers, ...rows].map((row) => row.map(csvEscape).join(';'));
  return `\uFEFF${lines.join('\r\n')}`;
}

export function listUnreadCriticalNotifications() {
  const data = readJsonStore(AUDIT_NOTIFICATIONS_FILE, defaultNotificationsStore());
  const notifications = Array.isArray(data.notifications) ? data.notifications : [];
  return notifications.filter((n) => !n.read);
}

export function markCriticalNotificationRead(id) {
  let found = false;
  updateJsonStore(AUDIT_NOTIFICATIONS_FILE, defaultNotificationsStore(), (state) => {
    if (!Array.isArray(state.notifications)) {
      state.notifications = [];
      return;
    }
    const item = state.notifications.find((n) => String(n.id) === String(id));
    if (item) {
      item.read = true;
      found = true;
    }
  });
  return found;
}

export function markAllCriticalNotificationsRead() {
  updateJsonStore(AUDIT_NOTIFICATIONS_FILE, defaultNotificationsStore(), (state) => {
    if (!Array.isArray(state.notifications)) {
      state.notifications = [];
      return;
    }
    state.notifications.forEach((n) => {
      n.read = true;
    });
  });
}
