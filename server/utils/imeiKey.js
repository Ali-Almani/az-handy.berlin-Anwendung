/** Gemeinsame IMEI-Normalisierung (Excel, Liste, Angenommen-Archiv). */

function sciNotationToDigitString(s) {
  const t = String(s ?? '').trim().replace(/\s+/g, '');
  const match = t.match(/^([+-]?)(\d+(?:\.\d+)?)[eE]([+-]?\d+)$/i);
  if (!match) return null;
  const sign = match[1];
  const mant = match[2];
  const exp = parseInt(match[3], 10);
  const dot = mant.indexOf('.');
  const intPart = dot === -1 ? mant : mant.slice(0, dot);
  const frac = dot === -1 ? '' : mant.slice(dot + 1);
  let all = intPart + frac;
  const decShift = frac.length;
  let shift = exp - decShift;
  if (shift >= 0) {
    all += '0'.repeat(shift);
  } else {
    const rm = -shift;
    if (all.length <= rm) return null;
    all = all.slice(0, all.length - rm);
  }
  all = all.replace(/^0+/, '') || '0';
  if (sign === '-') return null;
  return all;
}

export function normalizeImeiKey(imei) {
  const raw = String(imei ?? '').trim().replace(/\s+/g, '');
  if (!raw) return '';
  if (/[eE][+-]?\d+/.test(raw)) {
    const fromSci = sciNotationToDigitString(raw);
    if (fromSci && fromSci.length >= 14) return fromSci;
  }
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 14) return digits;
  return raw;
}

export function canonicalImeiString(imei) {
  return normalizeImeiKey(imei) || String(imei ?? '').trim();
}

export function imeiKeyFromRowId(rowId) {
  const s = String(rowId ?? '');
  const tailMatch = s.match(/-(\d{14,17})-(\d+)$/);
  if (tailMatch) return tailMatch[1];
  const parts = s.split('-');
  for (let i = 1; i < parts.length - 1; i += 1) {
    const k = normalizeImeiKey(parts[i]);
    if (k.length >= 14 && k.length <= 17) return k;
  }
  // Blattname kann Bindestriche enthalten: mittlere Segmente zusammenführen
  for (let i = 1; i < parts.length - 1; i += 1) {
    for (let j = i; j < parts.length - 1; j += 1) {
      const k = normalizeImeiKey(parts.slice(i, j + 1).join('-'));
      if (k.length >= 14 && k.length <= 17) return k;
    }
  }
  return normalizeImeiKey(s);
}

export function buildImeiRowId(item) {
  return `${item?.sheet || 'default'}-${item?.imei}-${item?.row}`;
}

/** Alle IMEI-Keys aus Upload-Zeile (Feld imei + Zellen in rowData). */
export function collectImeiKeysFromUploadRow(item) {
  const keys = new Set();
  const primary = normalizeImeiKey(item?.imei);
  if (primary) keys.add(primary);
  if (item?.rowData && typeof item.rowData === 'object' && !Array.isArray(item.rowData)) {
    for (const val of Object.values(item.rowData)) {
      if (val == null || val === '') continue;
      const k = normalizeImeiKey(val);
      if (k.length >= 14 && k.length <= 17) keys.add(k);
    }
  }
  return keys;
}
