const TICKET_ID_OLD_RE = /^(MNP|VV)-(\d{8})-(\d{3,})$/i;
const TICKET_ID_NEW_RE = /^(MNP|VV)(\d{6})(\d{3,})$/i;

function pad2(n) {
  return String(n).padStart(2, '0');
}

function pad3(n) {
  return String(n).padStart(3, '0');
}

function toShortDateKey(dd, mm, yyyy) {
  return `${pad2(dd)}${pad2(mm)}${String(yyyy).slice(-2)}`;
}

function compressDateKey(dateKey) {
  const key = String(dateKey ?? '');
  if (key.length === 8) return `${key.slice(0, 4)}${key.slice(6, 8)}`;
  return key;
}

export function ticketIdPrefixForType(entryType) {
  return String(entryType ?? '').trim().toLowerCase() === 'mnp' ? 'MNP' : 'VV';
}

/** YYYY-MM-DD oder DD.MM.YYYY → DDMMYY */
export function ticketIdDateKey(datum, fallbackDate = new Date()) {
  const raw = String(datum ?? '').trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return toShortDateKey(iso[3], iso[2], iso[1]);
  const de = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (de) return toShortDateKey(de[1], de[2], de[3]);
  const d = fallbackDate instanceof Date && !Number.isNaN(fallbackDate.getTime())
    ? fallbackDate
    : new Date();
  return toShortDateKey(d.getDate(), d.getMonth() + 1, d.getFullYear());
}

export function parseTicketId(id) {
  const s = String(id ?? '').trim();
  let m = s.match(TICKET_ID_NEW_RE);
  if (m) {
    return {
      prefix: m[1].toUpperCase(),
      dateKey: m[2],
      seq: parseInt(m[3], 10)
    };
  }
  m = s.match(TICKET_ID_OLD_RE);
  if (m) {
    return {
      prefix: m[1].toUpperCase(),
      dateKey: compressDateKey(m[2]),
      seq: parseInt(m[3], 10)
    };
  }
  return null;
}

export function formatTicketId(prefix, dateKey, seq) {
  const dk = compressDateKey(dateKey);
  return `${String(prefix).toUpperCase()}${dk}${pad3(seq)}`;
}

export function normalizeTicketId(id) {
  const parsed = parseTicketId(id);
  if (!parsed) return null;
  return formatTicketId(parsed.prefix, parsed.dateKey, parsed.seq);
}

export function isCanonicalTicketId(id, prefix) {
  const m = String(id ?? '').trim().match(TICKET_ID_NEW_RE);
  if (!m) return false;
  return m[1].toUpperCase() === String(prefix).toUpperCase();
}

export function nextTicketId(entries, { prefix, datum, createdAt } = {}) {
  const dateKey = ticketIdDateKey(datum, createdAt ? new Date(createdAt) : new Date());
  const p = String(prefix || 'VV').toUpperCase();
  let max = 0;
  for (const entry of Array.isArray(entries) ? entries : []) {
    const parsed = parseTicketId(entry?.id);
    if (!parsed || parsed.prefix !== p || parsed.dateKey !== dateKey) continue;
    if (Number.isFinite(parsed.seq) && parsed.seq > max) max = parsed.seq;
  }
  return formatTicketId(p, dateKey, max + 1);
}

export function needsTicketIdBackfill(entries) {
  if (!Array.isArray(entries)) return false;
  return entries.some((entry) => {
    const prefix = ticketIdPrefixForType(entry?.entryType);
    return !isCanonicalTicketId(entry?.id, prefix);
  });
}

/** Weist vorhandenen Einträgen ohne Kanon-ID eine ID zu. Mutiert `entries`. */
export function backfillTicketIds(entries) {
  if (!Array.isArray(entries)) return false;
  let changed = false;

  for (const entry of entries) {
    const prefix = ticketIdPrefixForType(entry?.entryType);
    if (isCanonicalTicketId(entry?.id, prefix)) continue;
    const migrated = normalizeTicketId(entry?.id);
    if (!migrated || !isCanonicalTicketId(migrated, prefix)) continue;
    if (entry.id !== migrated) {
      entry.id = migrated;
      changed = true;
    }
  }

  const pending = entries.filter((entry) => {
    const prefix = ticketIdPrefixForType(entry?.entryType);
    return !isCanonicalTicketId(entry?.id, prefix);
  });
  pending.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  for (const entry of pending) {
    entry.id = nextTicketId(entries, {
      prefix: ticketIdPrefixForType(entry.entryType),
      datum: entry.datum,
      createdAt: entry.createdAt
    });
    changed = true;
  }
  return changed;
}
