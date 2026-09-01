/** Verlauf-Aufbewahrung: Büro/Admin sehen Einträge der letzten N Tage aller Mitarbeiter. */
export const COPY_HISTORY_RETENTION_DAYS = Math.max(
  1,
  parseInt(process.env.COPY_HISTORY_RETENTION_DAYS || '4', 10) || 4
);
export const COPY_HISTORY_RETENTION_MS = COPY_HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;

const MIN_VALID_MS = Date.UTC(2020, 0, 1);

function extractTimestampRaw(entryOrRaw) {
  if (entryOrRaw != null && typeof entryOrRaw === 'object' && !Array.isArray(entryOrRaw)) {
    return (
      entryOrRaw.timestamp ??
      entryOrRaw.date ??
      entryOrRaw.time ??
      entryOrRaw.createdAt ??
      entryOrRaw.created_at
    );
  }
  return entryOrRaw;
}

export function parseCopyHistoryTimestamp(entryOrRaw) {
  const raw = extractTimestampRaw(entryOrRaw);
  if (raw == null || raw === '') return NaN;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (raw === 0) return NaN;
    const ms = raw < 1e12 ? raw * 1000 : raw;
    return ms >= MIN_VALID_MS ? ms : NaN;
  }
  const s = String(raw).trim();
  if (!s || s === '0') return NaN;
  let ts = Date.parse(s);
  if (!Number.isNaN(ts)) return ts >= MIN_VALID_MS ? ts : NaN;
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    const [, d, mo, y, h, mi, sec] = m;
    ts = new Date(+y, +mo - 1, +d, +h, +mi, +(sec || 0)).getTime();
    return ts >= MIN_VALID_MS ? ts : NaN;
  }
  return NaN;
}

function normCopyHistoryUserName(name) {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function copyHistoryEntryKey(entry) {
  const imei = String(entry?.imei ?? '').trim();
  const ts = String(entry?.timestamp ?? '').trim();
  const userName = normCopyHistoryUserName(entry?.userName);
  const action = String(entry?.action ?? '').trim();
  return `${imei}|${userName}|${ts}|${action}`;
}

/** Eine offene Verlaufszeile pro IMEI und Mitarbeiter (ältere Duplikate verwerfen). */
export function copyHistorySlotKey(entry) {
  const imei = String(entry?.imei ?? '').trim();
  return `${imei}|${normCopyHistoryUserName(entry?.userName)}`;
}

export function dedupeCopyHistoryByImeiUser(entries) {
  const bySlot = new Map();
  for (const e of Array.isArray(entries) ? entries : []) {
    if (!e || typeof e !== 'object') continue;
    const imei = String(e.imei ?? '').trim();
    if (!imei) continue;
    const slot = copyHistorySlotKey(e);
    const prev = bySlot.get(slot);
    if (!prev) {
      bySlot.set(slot, e);
      continue;
    }
    const tNew = parseCopyHistoryTimestamp(e);
    const tOld = parseCopyHistoryTimestamp(prev);
    const n = Number.isNaN(tNew) ? -1 : tNew;
    const o = Number.isNaN(tOld) ? -1 : tOld;
    if (n >= o) bySlot.set(slot, e);
  }
  return Array.from(bySlot.values());
}

export function copyHistoryEntryInRetentionWindow(entry, sinceMs = Date.now() - COPY_HISTORY_RETENTION_MS) {
  const ts = parseCopyHistoryTimestamp(entry);
  if (Number.isNaN(ts)) return true;
  return ts >= sinceMs;
}

export function trimCopyHistoryByRetention(entries, sinceMs = Date.now() - COPY_HISTORY_RETENTION_MS) {
  return (Array.isArray(entries) ? entries : [])
    .filter((e) => e && (e.imei || e.timestamp) && copyHistoryEntryInRetentionWindow(e, sinceMs))
    .sort(
      (a, b) =>
        (parseCopyHistoryTimestamp(b) || 0) - (parseCopyHistoryTimestamp(a) || 0)
    );
}

/** Bestehende Server-Einträge behalten – Client sendet oft nur die letzten 100. */
export function mergeCopyHistoryEntries(existing, incoming) {
  const byKey = new Map();
  for (const e of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    if (!e || typeof e !== 'object') continue;
    if (!e.imei && !e.timestamp) continue;
    byKey.set(copyHistoryEntryKey(e), e);
  }
  return trimCopyHistoryByRetention(dedupeCopyHistoryByImeiUser(Array.from(byKey.values())));
}
