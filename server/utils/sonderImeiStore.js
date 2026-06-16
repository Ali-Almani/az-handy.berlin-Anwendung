import { readJsonStore, updateJsonStore } from './jsonClusterStore.js';

const FILE = 'sonder-imeis.json';
const DEFAULT = () => ({ entries: [] });

/** Gleiche Logik wie normalizeImeiDedupKey im IMEI-Controller (ohne Zirkelimport). */
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

export function normalizeSonderImeiKey(imei) {
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

function dedupeEntries(entries) {
  const out = [];
  const seen = new Set();
  for (const e of entries) {
    if (!e || typeof e !== 'object') continue;
    const key = normalizeSonderImeiKey(e.imei);
    if (!key || key.length < 8 || seen.has(key)) continue;
    seen.add(key);
    out.push({
      imei: e.imei != null ? String(e.imei).trim() : key,
      approvedAt: e.approvedAt ? String(e.approvedAt) : '',
      approvedByName: e.approvedByName ? String(e.approvedByName) : ''
    });
  }
  return out;
}

export function getSonderPublishedEntries() {
  const raw = readJsonStore(FILE, DEFAULT());
  const entries = Array.isArray(raw?.entries) ? raw.entries : [];
  return dedupeEntries(entries);
}

/**
 * Neue Freigaben hinzufügen (Duplikat-IMEIs werden übersprungen).
 * @returns {object[]} Aktuelle Liste (wie getSonderPublishedEntries)
 */
export function addSonderImeiApprovals(imeiList, meta) {
  const rawPairs = Array.isArray(imeiList) ? imeiList : [];
  const approvedByName = String(meta?.approvedByName || '').trim() || 'Büro';
  const iso = new Date().toISOString();

  updateJsonStore(FILE, DEFAULT(), (state) => {
    if (!Array.isArray(state.entries)) state.entries = [];
    const seen = new Set(state.entries.map((e) => normalizeSonderImeiKey(e?.imei)).filter(Boolean));
    for (const rawImei of rawPairs) {
      const key = normalizeSonderImeiKey(rawImei);
      if (!key || key.length < 8) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      state.entries.push({
        imei: String(rawImei ?? '').trim() || key,
        approvedAt: iso,
        approvedByName
      });
    }
  });

  return getSonderPublishedEntries();
}
