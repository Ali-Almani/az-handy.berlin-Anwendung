/** Verlauf-Aufbewahrung: Büro/Admin sehen Einträge der letzten N Tage aller Mitarbeiter. */
export const COPY_HISTORY_RETENTION_DAYS = 4;
export const COPY_HISTORY_RETENTION_MS = COPY_HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function copyHistoryEntryKey(entry) {
  const imei = String(entry?.imei ?? '').trim();
  const ts = String(entry?.timestamp ?? '').trim();
  const userName = String(entry?.userName ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
  const action = String(entry?.action ?? '').trim();
  return `${imei}|${userName}|${ts}|${action}`;
}

export function parseCopyHistoryTimestamp(raw) {
  if (raw == null || raw === '') return NaN;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw < 1e12 ? raw * 1000 : raw;
  }
  const s = String(raw).trim();
  if (!s) return NaN;
  let ts = Date.parse(s);
  if (!Number.isNaN(ts)) return ts;
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    const [, d, mo, y, h, mi, sec] = m;
    return new Date(+y, +mo - 1, +d, +h, +mi, +(sec || 0)).getTime();
  }
  return NaN;
}

export function copyHistoryEntryInRetentionWindow(entry, sinceMs = Date.now() - COPY_HISTORY_RETENTION_MS) {
  const ts = parseCopyHistoryTimestamp(entry?.timestamp);
  if (Number.isNaN(ts)) return true;
  return ts >= sinceMs;
}

export function trimCopyHistoryByRetention(entries, sinceMs = Date.now() - COPY_HISTORY_RETENTION_MS) {
  return (Array.isArray(entries) ? entries : [])
    .filter((e) => e && (e.imei || e.timestamp) && copyHistoryEntryInRetentionWindow(e, sinceMs))
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
}

/** Bestehende Server-Einträge behalten – Client sendet oft nur die letzten 100. */
export function mergeCopyHistoryEntries(existing, incoming) {
  const byKey = new Map();
  for (const e of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    if (!e || typeof e !== 'object') continue;
    if (!e.imei && !e.timestamp) continue;
    byKey.set(copyHistoryEntryKey(e), e);
  }
  return trimCopyHistoryByRetention(Array.from(byKey.values()));
}
