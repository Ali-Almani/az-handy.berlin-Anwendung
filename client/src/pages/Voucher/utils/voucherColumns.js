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

/** Tabs in fester Reihenfolge; jede Zeile gehört genau einem Tab (Priorität o2 → AG0 → 5 € → Sonstige). */
export const VOUCHER_FIXED_TABS = [
  { id: 'o2_ff', label: 'o2 mit Family and Friends' },
  { id: 'ay_ag0', label: 'Ay Yildiz · AG0- Voucher' },
  { id: 'ay_5eur', label: 'Ay Yildiz 5Euro Rabatt Voucher' },
  { id: 'sonstige', label: 'Sonstige' }
];

function rowBlobParts(row) {
  const s = rowSearchBlob(row);
  return { s, compact: s.replace(/\s+/g, '') };
}

export function matchesO2Ff(row) {
  const { s, compact } = rowBlobParts(row);
  return (
    (s.includes('o2') || s.includes('telefónica') || s.includes('telefonica')) &&
    (s.includes('family') ||
      s.includes('friends') ||
      s.includes('f&f') ||
      s.includes('f & f') ||
      compact.includes('f&f'))
  );
}

export function matchesAyAg0(row) {
  const { s, compact } = rowBlobParts(row);
  const hasYildiz =
    s.includes('yildiz') || s.includes('ay yildiz') || compact.includes('ayyildiz') || s.includes('ay-yildiz');
  return hasYildiz && (s.includes('ag0') || s.includes('ag 0'));
}

export function matchesAy5Eur(row) {
  const { s, compact } = rowBlobParts(row);
  const hasYildiz =
    s.includes('yildiz') || s.includes('ay yildiz') || compact.includes('ayyildiz') || s.includes('ay-yildiz');
  return (
    hasYildiz && (s.includes('rabatt') || s.includes('5 euro') || s.includes('5€') || compact.includes('5euro'))
  );
}

export function getRowVoucherTabId(row) {
  if (matchesO2Ff(row)) return 'o2_ff';
  if (matchesAyAg0(row)) return 'ay_ag0';
  if (matchesAy5Eur(row)) return 'ay_5eur';
  return 'sonstige';
}

export function rowMatchesVoucherTab(row, tabId) {
  return getRowVoucherTabId(row) === tabId;
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
