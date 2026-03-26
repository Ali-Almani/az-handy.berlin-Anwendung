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

export function findNummerKey(headers) {
  if (!headers?.length) return null;
  const tests = [/nummer/i, /voucher[\s\-_]?nummer/i, /^code$/i, /voucher[\s\-_]?code/i, /^nr\.?$/i];
  for (const h of headers) {
    const s = String(h || '');
    if (tests.some((re) => re.test(s))) return h;
  }
  return null;
}

export function getRowNummer(row, nummerKey) {
  if (!nummerKey || !row?.rowData) return '';
  const v = row.rowData[nummerKey];
  return v != null && v !== undefined ? String(v).trim() : '';
}

function rowSearchBlob(row) {
  if (!row?.rowData) return '';
  return Object.values(row.rowData)
    .map((v) => String(v ?? '').toLowerCase())
    .join('\n');
}

/** Drei feste Tabs – Zuordnung über Zeileninhalte (wie frühere Demo-Kategorien). */
export const VOUCHER_FIXED_TABS = [
  { id: 'o2_ff', label: 'o2 mit Family and Friends' },
  { id: 'ay_ag0', label: 'Ay Yildiz · AG0- Voucher' },
  { id: 'ay_5eur', label: 'Ay Yildiz 5Euro Rabatt Voucher' }
];

export function rowMatchesVoucherTab(row, tabId) {
  const s = rowSearchBlob(row);
  switch (tabId) {
    case 'o2_ff':
      return (
        s.includes('o2') &&
        (s.includes('family') || s.includes('friends') || s.includes('f&f') || s.includes('f & f'))
      );
    case 'ay_ag0':
      return (s.includes('yildiz') || s.includes('ay yildiz')) && s.includes('ag0');
    case 'ay_5eur':
      return (
        (s.includes('yildiz') || s.includes('ay yildiz')) &&
        (s.includes('rabatt') || s.includes('5 euro') || s.includes('5€'))
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
