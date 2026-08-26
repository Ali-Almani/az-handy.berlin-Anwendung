import { readJsonStore, updateJsonStore } from './jsonClusterStore.js';
import { normalizeSonderImeiKey } from './sonderImeiStore.js';

const FILE = 'accepted-imeis.json';
const DEFAULT = () => ({ entries: [] });

function parseRangeMs(value, endOfDay = false) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return null;
  if (endOfDay) return ms + 86400000 - 1;
  return ms;
}

export function listAcceptedImeis({ from, to } = {}) {
  const raw = readJsonStore(FILE, DEFAULT());
  let entries = Array.isArray(raw?.entries) ? raw.entries : [];
  const fromMs = parseRangeMs(from, false);
  const toMs = parseRangeMs(to, true);
  if (fromMs != null) {
    entries = entries.filter((e) => {
      const t = Date.parse(e?.acceptedAt || 0);
      return !Number.isNaN(t) && t >= fromMs;
    });
  }
  if (toMs != null) {
    entries = entries.filter((e) => {
      const t = Date.parse(e?.acceptedAt || 0);
      return !Number.isNaN(t) && t <= toMs;
    });
  }
  return entries
    .slice()
    .sort((a, b) => Date.parse(b?.acceptedAt || 0) - Date.parse(a?.acceptedAt || 0));
}

/** Anzeige: pro IMEI+Verlauf-Timestamp nur den neuesten Eintrag */
function dedupeEntriesForDisplay(entries) {
  const byKey = new Map();
  for (const entry of entries) {
    const key = `${entry?.imeiKey || normalizeSonderImeiKey(entry?.imei)}|${entry?.historyTimestamp || ''}`;
    if (!byKey.has(key)) byKey.set(key, entry);
  }
  return Array.from(byKey.values()).sort(
    (a, b) => Date.parse(b?.acceptedAt || 0) - Date.parse(a?.acceptedAt || 0)
  );
}

export function listAcceptedImeisForDisplay(options) {
  return dedupeEntriesForDisplay(listAcceptedImeis(options));
}

export function getAcceptedImeiKeySet() {
  const raw = readJsonStore(FILE, DEFAULT());
  const entries = Array.isArray(raw?.entries) ? raw.entries : [];
  return new Set(entries.map((e) => normalizeSonderImeiKey(e?.imei)).filter(Boolean));
}

function isDuplicateAcceptedEntry(existing, entry, imeiKey) {
  if (!existing || !imeiKey || existing.imeiKey !== imeiKey) return false;
  const historyTs = entry.historyTimestamp ? String(entry.historyTimestamp) : '';
  const existingTs = existing.historyTimestamp ? String(existing.historyTimestamp) : '';
  if (historyTs && existingTs === historyTs) return true;
  if (historyTs) return false;
  const acceptedMs = Date.parse(existing.acceptedAt || 0);
  return !Number.isNaN(acceptedMs) && Date.now() - acceptedMs < 120000;
}

export function addAcceptedImeiEntry(entry = {}) {
  const imeiKey = normalizeSonderImeiKey(entry.imei);
  let resultId = null;
  updateJsonStore(FILE, DEFAULT(), (state) => {
    if (!Array.isArray(state.entries)) state.entries = [];
    const dup = state.entries.find((e) => isDuplicateAcceptedEntry(e, entry, imeiKey));
    if (dup) {
      resultId = dup.id;
      return { value: dup.id };
    }
    const id = `acc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    state.entries.push({
      id,
      imei: String(entry.imei ?? '').trim(),
      imeiKey,
      product: String(entry.product ?? '').trim(),
      userName: String(entry.userName ?? '').trim(),
      acceptedAt: entry.acceptedAt ? String(entry.acceptedAt) : new Date().toISOString(),
      acceptedByUserId: entry.acceptedByUserId != null ? String(entry.acceptedByUserId) : '',
      acceptedByName: String(entry.acceptedByName ?? '').trim(),
      historyTimestamp: entry.historyTimestamp ? String(entry.historyTimestamp) : ''
    });
    resultId = id;
    return { value: id };
  });
  return resultId;
}

export function permanentlyDeleteAcceptedEntry(id) {
  let removed = false;
  updateJsonStore(FILE, DEFAULT(), (state) => {
    if (!Array.isArray(state.entries)) state.entries = [];
    const before = state.entries.length;
    state.entries = state.entries.filter((e) => String(e?.id) !== String(id));
    removed = state.entries.length < before;
  });
  return removed;
}

/** Mehrere Einträge in einem Schreibvorgang dauerhaft löschen. */
export function permanentlyDeleteAcceptedEntriesByIds(ids = []) {
  const idSet = new Set((Array.isArray(ids) ? ids : []).map((id) => String(id)).filter(Boolean));
  if (idSet.size === 0) return 0;
  let removed = 0;
  updateJsonStore(FILE, DEFAULT(), (state) => {
    if (!Array.isArray(state.entries)) state.entries = [];
    const before = state.entries.length;
    state.entries = state.entries.filter((e) => !idSet.has(String(e?.id)));
    removed = before - state.entries.length;
  });
  return removed;
}

/** Alle Einträge im Zeitraum löschen (inkl. nicht angezeigter Duplikate). */
export function permanentlyDeleteAcceptedEntriesInRange({ from, to } = {}) {
  const fromMs = parseRangeMs(from, false);
  const toMs = parseRangeMs(to, true);
  let removed = 0;
  updateJsonStore(FILE, DEFAULT(), (state) => {
    if (!Array.isArray(state.entries)) state.entries = [];
    const before = state.entries.length;
    state.entries = state.entries.filter((e) => {
      const t = Date.parse(e?.acceptedAt || 0);
      if (Number.isNaN(t)) return true;
      if (fromMs != null && t < fromMs) return true;
      if (toMs != null && t > toMs) return true;
      return false;
    });
    removed = before - state.entries.length;
  });
  return removed;
}

/** Excel-Re-Import: Archiv-Einträge für diese IMEI-Keys entfernen (Wiederherstellung in Hauptliste). */
export function removeAcceptedImeiEntriesByImeiKeys(imeiKeys = []) {
  const keySet = new Set(
    (Array.isArray(imeiKeys) ? imeiKeys : [])
      .map((k) => normalizeSonderImeiKey(k))
      .filter(Boolean)
  );
  if (keySet.size === 0) return 0;
  let removed = 0;
  updateJsonStore(FILE, DEFAULT(), (state) => {
    if (!Array.isArray(state.entries)) state.entries = [];
    const before = state.entries.length;
    state.entries = state.entries.filter((e) => !keySet.has(normalizeSonderImeiKey(e?.imei)));
    removed = before - state.entries.length;
  });
  return removed;
}
