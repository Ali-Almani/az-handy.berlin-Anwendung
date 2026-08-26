const COPY_HISTORY_RETENTION_DAYS = 4;
const COPY_HISTORY_RETENTION_MS = COPY_HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;

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

export function trimCopyHistoryByRetention(entries) {
  const sinceMs = Date.now() - COPY_HISTORY_RETENTION_MS;
  return (Array.isArray(entries) ? entries : [])
    .filter((e) => {
      if (!e || (!e.imei && !e.timestamp)) return false;
      const ts = Date.parse(e?.timestamp || '');
      if (Number.isNaN(ts)) return true;
      return ts >= sinceMs;
    })
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
}

export function isOfficeImeiRole(role) {
  const raw = String(role ?? '').trim();
  const r = raw.toLowerCase().replace(/ü/g, 'u');
  if (!r) return false;
  if (r.includes('admin') || raw === 'Administrator') return true;
  if (r === 'buro mitarbeiter' || r === 'buro') return true;
  return r.includes('buro') && r.includes('mitarbeiter');
}
