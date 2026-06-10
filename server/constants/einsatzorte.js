/** Kurzname → Anzeige-/Speichername (Straße) */
export const EINSATZORT_LEGACY_MAP = {
  Sonne: 'Sonnenallee 16',
  KM127: 'Karl-Marx-Straße 127',
  KM169: 'Karl-Marx-Straße 169',
  KM50: 'Karl-Marx-Straße 50',
  Turm: 'Turmstraße 47',
  Bad: 'Badstraße 12',
  Haupt: 'Hauptstraße 156'
};

export const FILIALE_OPTIONS = Object.values(EINSATZORT_LEGACY_MAP);

export const ALLOWED_EINSATZ_ORT = new Set([
  'Zentrale',
  ...FILIALE_OPTIONS,
  ...Object.keys(EINSATZORT_LEGACY_MAP)
]);

export function normalizeEinsatzOrt(value) {
  const v = String(value ?? '').trim();
  if (!v) return '';
  return EINSATZORT_LEGACY_MAP[v] || v;
}

export function canonicalizeEinsatzOrt(value) {
  const n = normalizeEinsatzOrt(value);
  return n || null;
}

/** Stabile Vergleichs-Keys (Legacy-Kurznamen und neue Straßennamen) */
const EINSATZORT_MATCH_KEY = {
  Zentrale: 'zentrale',
  'Sonnenallee 16': 'sonnenallee16',
  'Karl-Marx-Straße 127': 'km127',
  'Karl-Marx-Straße 169': 'km169',
  'Karl-Marx-Straße 50': 'km50',
  'Turmstraße 47': 'turmstr47',
  'Badstraße 12': 'badstr12',
  'Hauptstraße 156': 'hauptstr156'
};

export function normalizeEinsatzOrtKey(ort) {
  const canonical = normalizeEinsatzOrt(ort);
  if (canonical && EINSATZORT_MATCH_KEY[canonical]) {
    return EINSATZORT_MATCH_KEY[canonical];
  }
  return String(ort ?? '')
    .replace(/\u00a0/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[-_/]+/g, '')
    .replace(/\s+/g, '');
}

export function normalizeFiliale(value) {
  const v = String(value ?? '').trim();
  if (!v) return '';
  const canonical = normalizeEinsatzOrt(v);
  return FILIALE_OPTIONS.includes(canonical) ? canonical : v;
}

export function isValidFiliale(value) {
  const v = String(value ?? '').trim();
  if (!v) return false;
  return FILIALE_OPTIONS.includes(normalizeEinsatzOrt(v));
}
