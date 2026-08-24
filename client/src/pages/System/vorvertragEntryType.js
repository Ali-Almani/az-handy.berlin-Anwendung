export const VORVERTRAG_ENTRY_TYPE_VORVERTRAG = 'vorvertrag';
export const VORVERTRAG_ENTRY_TYPE_MNP = 'mnp';

export function normalizeVorvertragEntryType(value) {
  return String(value ?? '').trim().toLowerCase() === VORVERTRAG_ENTRY_TYPE_MNP
    ? VORVERTRAG_ENTRY_TYPE_MNP
    : VORVERTRAG_ENTRY_TYPE_VORVERTRAG;
}

export function isMnpOnlyEntry(entry) {
  return normalizeVorvertragEntryType(entry?.entryType) === VORVERTRAG_ENTRY_TYPE_MNP;
}
