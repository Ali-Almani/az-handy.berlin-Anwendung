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

export const EINSATZ_ORT_OPTIONS = [
  { value: '', label: '– Keiner –' },
  { value: 'Zentrale', label: 'Zentrale' },
  ...FILIALE_OPTIONS.map((label) => ({ value: label, label }))
];

export function normalizeEinsatzOrt(value) {
  const v = String(value ?? '').trim();
  if (!v) return '';
  return EINSATZORT_LEGACY_MAP[v] || v;
}

export function formatEinsatzOrt(value) {
  const n = normalizeEinsatzOrt(value);
  return n || '–';
}

export const EINSATZ_ORT_SORT_ORDER = ['Zentrale', ...FILIALE_OPTIONS];

export const ALLOWED_EINSATZ_ORT = new Set([
  'Zentrale',
  ...FILIALE_OPTIONS,
  ...Object.keys(EINSATZORT_LEGACY_MAP)
]);
