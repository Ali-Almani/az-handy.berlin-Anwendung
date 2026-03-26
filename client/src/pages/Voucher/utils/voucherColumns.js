/** Erkennt Spalte „Nummer“ / Code (Kopie bei Reservieren). */
export function findVoucherArtKey(headers) {
  if (!headers?.length) return null;
  const tests = [/voucher[\s\-_]?art/i, /voucher\s*type/i, /^art$/i, /vouchertype/i];
  for (const h of headers) {
    const s = String(h || '');
    if (tests.some((re) => re.test(s))) return h;
  }
  return null;
}

/** Bekannte Überschriften für die Voucher-/PIN-Spalte (Trim, Excel-Alias-Spalten). */
export function findNummerKey(headers) {
  if (!headers?.length) return null;
  const tests = [
    /nummer/i,
    /voucher[\s\-_]?nummer/i,
    /^code$/i,
    /voucher[\s\-_]?code/i,
    /^nr\.?$/i,
    /\bnr\b/i,
    /^pin$/i,
    /serien(nummer)?/i,
    /kartennummer/i,
    /gutschein[\s\-_]?nummer/i,
    /^:\s*nummer$/i
  ];
  for (const h of headers) {
    const raw = String(h ?? '');
    const s = raw.trim();
    if (!s) continue;
    if (tests.some((re) => re.test(s))) return raw;
  }
  return null;
}

/**
 * Wenn die Überschrift nicht „Nummer“ heißt (z. B. leer, „:“ oder „Spalte3“):
 * Spalte wählen, in der fast nur lange Ziffernfolgen stehen (Excel formatiert manchmal mit führendem „:“).
 */
export function findNummerKeyHeuristic(rows, headers) {
  if (!rows?.length || !headers?.length) return null;
  const sample = rows.slice(0, Math.min(rows.length, 80));
  const looksLikeVoucherNumber = (val) => {
    const s = String(val ?? '')
      .trim()
      .replace(/^:+\s*/, '');
    return /^\d{10,20}$/.test(s);
  };

  let bestKey = null;
  let bestMatch = -1;
  let bestTotal = -1;

  for (const h of headers) {
    if (h === undefined || h === null) continue;
    const key = String(h);
    let match = 0;
    let total = 0;
    for (const row of sample) {
      const v = row.rowData?.[key];
      if (v == null || String(v).trim() === '') continue;
      total++;
      if (looksLikeVoucherNumber(v)) match++;
    }
    if (total === 0) continue;
    const ratio = match / total;
    if (ratio < 0.55) continue;
    if (match > bestMatch || (match === bestMatch && total > bestTotal)) {
      bestMatch = match;
      bestTotal = total;
      bestKey = key;
    }
  }
  return bestKey;
}

/** Namens-basierte Suche, sonst Heuristik über die Datenzeilen. */
export function resolveNummerKey(columnOrder, rows) {
  const order = Array.isArray(columnOrder) ? columnOrder : [];
  const fromName = findNummerKey(order);
  if (fromName) return fromName;
  return findNummerKeyHeuristic(rows, order);
}

export function getRowNummer(row, nummerKey) {
  if (!nummerKey || !row?.rowData) return '';
  const v = row.rowData[nummerKey];
  if (v == null || v === undefined) return '';
  return String(v)
    .trim()
    .replace(/^:+\s*/, '');
}

function rowSearchBlob(row) {
  if (!row?.rowData) return '';
  return Object.values(row.rowData)
    .map((v) => String(v ?? '').toLowerCase())
    .join('\n');
}

/**
 * „Alle“ zeigt jede importierte Zeile (wichtig für Excel ohne o2-/Yildiz-Text in Zellen).
 * Die anderen Tabs filtern nach typischen Begriffen – Varianten ohne Leerzeichen (z. B. 5euro) auch erkannt.
 */
export const VOUCHER_FIXED_TABS = [
  { id: 'all', label: 'Alle' },
  { id: 'o2_ff', label: 'o2 mit Family and Friends' },
  { id: 'ay_ag0', label: 'Ay Yildiz · AG0- Voucher' },
  { id: 'ay_5eur', label: 'Ay Yildiz 5Euro Rabatt Voucher' }
];

export function rowMatchesVoucherTab(row, tabId) {
  if (tabId === 'all') return true;
  const s = rowSearchBlob(row);
  const compact = s.replace(/\s+/g, '');
  const hasYildiz =
    s.includes('yildiz') || s.includes('ay yildiz') || compact.includes('ayyildiz') || s.includes('ay-yildiz');
  switch (tabId) {
    case 'o2_ff':
      return (
        (s.includes('o2') || s.includes('telefónica') || s.includes('telefonica')) &&
        (s.includes('family') ||
          s.includes('friends') ||
          s.includes('f&f') ||
          s.includes('f & f') ||
          compact.includes('f&f'))
      );
    case 'ay_ag0':
      return hasYildiz && (s.includes('ag0') || s.includes('ag 0'));
    case 'ay_5eur':
      return (
        hasYildiz &&
        (s.includes('rabatt') || s.includes('5 euro') || s.includes('5€') || compact.includes('5euro'))
      );
    default:
      return false;
  }
}

/** Wie IMEI-Tabelle: Nummer, Aktion, dann übrige Spalten. */
export function buildVoucherDisplayColumns(columnOrder, nummerKey) {
  const base = Array.isArray(columnOrder) ? [...columnOrder] : [];
  if (!nummerKey) {
    return ['__aktion__', ...base];
  }
  const rest = base.filter((c) => c !== nummerKey);
  return ['__nummer__', '__aktion__', ...rest];
}
