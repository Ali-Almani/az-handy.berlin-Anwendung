/** Erkennt Spalten für Voucher-Art (Tabs) und Nummer (Kopie bei Reservieren). */
export function findVoucherArtKey(headers) {
  if (!headers?.length) return null;
  const tests = [
    /voucher[\s\-_]?art/i,
    /voucher\s*type/i,
    /^art$/i,
    /vouchertype/i
  ];
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

export function getRowVoucherArt(row, artKey) {
  if (!artKey || !row?.rowData) return '';
  const v = row.rowData[artKey];
  const s = v != null && v !== undefined ? String(v).trim() : '';
  return s || '(Ohne Angabe)';
}

export function uniqueTabsForRows(rows, artKey) {
  if (!artKey || !rows?.length) return [];
  const set = new Set();
  rows.forEach((r) => {
    set.add(getRowVoucherArt(r, artKey));
  });
  return Array.from(set).sort((a, b) => String(a).localeCompare(String(b), 'de'));
}

export function buildDisplayColumnOrder(columnOrder, nummerKey) {
  const base = Array.isArray(columnOrder) ? [...columnOrder] : [];
  if (!nummerKey || !base.includes(nummerKey)) {
    return [...base, '__aktion__'];
  }
  const out = [];
  for (const c of base) {
    out.push(c);
    if (c === nummerKey) out.push('__aktion__');
  }
  return out;
}
