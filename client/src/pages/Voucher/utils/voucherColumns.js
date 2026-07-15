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

/** Lange Ziffernfolge (Voucher-/PIN-Nummer), keine Titel- oder Beschreibungstexte. */
export function looksLikeVoucherNumber(val) {
  const s =
    val == null || val === undefined
      ? ''
      : String(val)
          .trim()
          .replace(/^:+\s*/, '');
  if (!s) return false;
  return /^\d{10,20}$/.test(s);
}

/** Excel-Zeile mit Titel/Beschreibung in der Nummer-Spalte (z. B. „24 Monate x 5€ …“). */
export function isVoucherTitleRow(row, nummerKey) {
  if (row?.isTitleRow === true) return true;
  if (row?.isTitleRow === false) return false;
  if (!nummerKey) return false;
  const value = getRowNummer(row, nummerKey);
  if (!value) return false;
  return !looksLikeVoucherNumber(value);
}

/**
 * Tabellen-Anzeige: alle Zeichen außer den letzten `visibleLast` durch • ersetzen.
 * Kurze Werte (Länge ≤ visibleLast) unverändert.
 */
export function formatVoucherNummerForDisplay(nummer, { visibleLast = 4 } = {}) {
  const s =
    nummer == null || nummer === undefined
      ? ''
      : String(nummer)
          .trim()
          .replace(/^:+\s*/, '');
  if (!s) return '';
  if (s.length <= visibleLast) return s;
  return `${'•'.repeat(s.length - visibleLast)}${s.slice(-visibleLast)}`;
}

function rowSearchBlob(row) {
  if (!row?.rowData) return '';
  return Object.values(row.rowData)
    .map((v) => String(v ?? '').toLowerCase())
    .join('\n');
}

/** Tabs in der Voucher-Verwaltung (sichtbar). */
export const VOUCHER_FIXED_TABS = [
  { id: 'o2_ff', label: 'o2 mit Family and Friends' },
  { id: 'ay_ag0', label: 'Ay Yildiz · AG0- Voucher' },
  { id: 'ay_ag0_5eur', label: '24 x -5 Euro GG Nachlass' },
  { id: 'ay_ag0_750eur', label: '24 x -7,50 Euro GG Nachlass' },
  { id: 'ay_ag0_10eur', label: '24 x -10 Euro GG Nachlass' }
];

/** Entfernt „24 Monate x “ aus Excel-Titelzeilen. */
export function normalizeVoucherTitleText(text) {
  return String(text ?? '')
    .trim()
    .replace(/^24\s*monate\s*x\s*/i, '');
}

function voucherRowKey(row) {
  return `${row?.sheet || 'default'}-${row?.row}`;
}

/** Ay-AG0-Unterkategorie aus Titelzeile (ohne „24 Monate x “). */
export function sectionIdFromAyAg0Title(text) {
  const t = normalizeVoucherTitleText(text).toLowerCase();
  if (!t) return null;
  if (/5\s*€/.test(t) && t.includes('110')) return 'ay_ag0_5eur';
  if ((/7[,.]?\s*50\s*€/.test(t) || t.includes('7,50')) && t.includes('165')) return 'ay_ag0_750eur';
  if (/10\s*€/.test(t) && t.includes('220')) return 'ay_ag0_10eur';
  return null;
}

/**
 * Ordnet Ay-AG0-Voucher-Zeilen anhand der Titelzeile darüber einer Unterkategorie zu.
 * @returns {Map<string, string>} rowKey → tabId
 */
export function buildAyAg0SectionMap(rows, nummerKey) {
  const map = new Map();
  if (!rows?.length || !nummerKey) return map;

  const bySheet = new Map();
  for (const row of rows) {
    if (!matchesAyAg0(row)) continue;
    const sheet = row.sheet || 'default';
    if (!bySheet.has(sheet)) bySheet.set(sheet, []);
    bySheet.get(sheet).push(row);
  }

  for (const sheetRows of bySheet.values()) {
    const hasTitleRows = sheetRows.some((row) => isVoucherTitleRow(row, nummerKey));
    if (!hasTitleRows) continue;

    sheetRows.sort((a, b) => Number(a.row) - Number(b.row));
    let currentSection = null;
    for (const row of sheetRows) {
      if (isVoucherTitleRow(row, nummerKey)) {
        currentSection = sectionIdFromAyAg0Title(getRowNummer(row, nummerKey));
        continue;
      }
      if (currentSection) {
        map.set(voucherRowKey(row), currentSection);
      }
    }
  }

  return map;
}

function rowBlobParts(row) {
  const s = rowSearchBlob(row);
  return { s, compact: s.replace(/\s+/g, '') };
}

/** Excel-Blattname (z. B. „o2 mit Family and Friends“) – auch wenn die Zeilen nur Nummern enthalten. */
function sheetMatchesO2Ff(sheetName) {
  if (sheetName == null || String(sheetName).trim() === '') return false;
  const s = String(sheetName).toLowerCase().trim();
  const compact = s.replace(/\s+/g, '');
  const hasO2 = s.includes('o2') || s.includes('telefónica') || s.includes('telefonica');
  if (!hasO2) return false;
  return (
    s.includes('family') ||
    s.includes('friends') ||
    s.includes('f&f') ||
    s.includes('f & f') ||
    compact.includes('f&f') ||
    /family\s*(and|&|und)\s*friends/i.test(String(sheetName))
  );
}

export function matchesO2Ff(row) {
  if (sheetMatchesO2Ff(row?.sheet)) return true;
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

function sheetMatchesAyAg0(sheetName) {
  if (sheetName == null || String(sheetName).trim() === '') return false;
  const s = String(sheetName).toLowerCase().trim();
  const compact = s.replace(/\s+/g, '');
  const hasYildiz =
    s.includes('yildiz') || s.includes('ay yildiz') || compact.includes('ayyildiz') || s.includes('ay-yildiz');
  return hasYildiz && (s.includes('ag0') || s.includes('ag 0'));
}

function sheetMatchesAy5Eur(sheetName) {
  if (sheetName == null || String(sheetName).trim() === '') return false;
  const s = String(sheetName).toLowerCase().trim();
  const compact = s.replace(/\s+/g, '');
  const hasYildiz =
    s.includes('yildiz') || s.includes('ay yildiz') || compact.includes('ayyildiz') || s.includes('ay-yildiz');
  return (
    hasYildiz && (s.includes('rabatt') || s.includes('5 euro') || s.includes('5€') || compact.includes('5euro'))
  );
}

export function matchesAyAg0(row) {
  if (sheetMatchesAyAg0(row?.sheet)) return true;
  const { s, compact } = rowBlobParts(row);
  const hasYildiz =
    s.includes('yildiz') || s.includes('ay yildiz') || compact.includes('ayyildiz') || s.includes('ay-yildiz');
  return hasYildiz && (s.includes('ag0') || s.includes('ag 0'));
}

export function matchesAy5Eur(row) {
  if (sheetMatchesAy5Eur(row?.sheet)) return true;
  const { s, compact } = rowBlobParts(row);
  const hasYildiz =
    s.includes('yildiz') || s.includes('ay yildiz') || compact.includes('ayyildiz') || s.includes('ay-yildiz');
  return (
    hasYildiz && (s.includes('rabatt') || s.includes('5 euro') || s.includes('5€') || compact.includes('5euro'))
  );
}

/** @returns {'o2_ff' | 'ay_ag0' | 'ay_ag0_5eur' | 'ay_ag0_750eur' | 'ay_ag0_10eur' | 'ay_5eur' | null} */
export function getRowVoucherTabId(row, context = {}) {
  const nummerKey = context.nummerKey ?? null;
  if (isVoucherTitleRow(row, nummerKey)) return null;
  if (matchesO2Ff(row)) return 'o2_ff';
  if (matchesAyAg0(row)) {
    const section = context.sectionMap?.get(voucherRowKey(row));
    return section || 'ay_ag0';
  }
  if (matchesAy5Eur(row)) return 'ay_5eur';
  return null;
}

export function rowMatchesVoucherTab(row, tabId, context = {}) {
  const id = getRowVoucherTabId(row, context);
  return id != null && id === tabId;
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
