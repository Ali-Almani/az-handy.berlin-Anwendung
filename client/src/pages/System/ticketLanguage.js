export const TICKET_LANGUAGE_OPTIONS = [
  'Arabisch',
  'Deutsch',
  'Englisch',
  'Indisch',
  'Urdu'
];

export const TICKET_LANGUAGE_DEFAULT = 'Deutsch';
export const TICKET_LANGUAGE_DEFAULT_NEU = 'Arabisch';

const LANGUAGE_ALIASES = {
  arabisch: 'Arabisch',
  araboisch: 'Arabisch',
  arabic: 'Arabisch',
  deutsch: 'Deutsch',
  german: 'Deutsch',
  englisch: 'Englisch',
  english: 'Englisch',
  indisch: 'Indisch',
  inidi: 'Indisch',
  hindi: 'Indisch',
  indian: 'Indisch',
  pakistani: 'Urdu',
  pakistanie: 'Urdu',
  urdu: 'Urdu',
  urdo: 'Urdu'
};

export function normalizeTicketLanguage(value) {
  const v = String(value ?? '').trim();
  if (TICKET_LANGUAGE_OPTIONS.includes(v)) return v;
  return LANGUAGE_ALIASES[v.toLowerCase()] || TICKET_LANGUAGE_DEFAULT;
}

const LANGUAGE_SHORT = {
  Arabisch: 'AR',
  Deutsch: 'DE',
  Englisch: 'EN',
  Indisch: 'IN',
  Urdu: 'UR'
};

export function compactTicketLanguage(value) {
  const v = normalizeTicketLanguage(value);
  return LANGUAGE_SHORT[v] || v.slice(0, 2).toUpperCase();
}
