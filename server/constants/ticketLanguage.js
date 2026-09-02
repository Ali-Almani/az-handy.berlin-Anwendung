export const TICKET_LANGUAGE_OPTIONS = [
  'Arabisch',
  'Deutsch',
  'Englisch',
  'Indisch',
  'Pakistani'
];

export const TICKET_LANGUAGE_DEFAULT = 'Deutsch';

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
  pakistani: 'Pakistani',
  pakistanie: 'Pakistani',
  urdu: 'Pakistani'
};

export function normalizeTicketLanguage(value) {
  const v = String(value ?? '').trim();
  if (TICKET_LANGUAGE_OPTIONS.includes(v)) return v;
  return LANGUAGE_ALIASES[v.toLowerCase()] || TICKET_LANGUAGE_DEFAULT;
}
