import { readJsonStore, updateJsonStore } from './jsonClusterStore.js';

export const AUDIT_LOG_FILE = 'audit-log.json';
export const AUDIT_RETENTION_DAYS = 30;

export const AUDIT_CATEGORIES = [
  'auth',
  'user',
  'imei',
  'vorvertrag',
  'voucher',
  'excel',
  'dashboard'
];

const defaultStore = () => ({ entries: [] });

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
      meta: payload.meta && typeof payload.meta === 'object' && !Array.isArray(payload.meta)
        ? payload.meta
        : {}
    };

    updateJsonStore(AUDIT_LOG_FILE, defaultStore(), (state) => {
      if (!Array.isArray(state.entries)) state.entries = [];
      state.entries.unshift(entry);
      state.entries = purgeOlderThan(AUDIT_RETENTION_DAYS, state.entries);
      if (state.entries.length > 5000) {
        state.entries = state.entries.slice(0, 5000);
      }
    });
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

export function listAuditLogs(options = {}) {
  const limit = Math.min(Math.max(parseInt(String(options.limit ?? 50), 10) || 50, 1), 200);
  const offset = Math.max(parseInt(String(options.offset ?? 0), 10) || 0, 0);
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
  const total = entries.length;
  const page = entries.slice(offset, offset + limit);

  return { entries: page, total, limit, offset };
}
