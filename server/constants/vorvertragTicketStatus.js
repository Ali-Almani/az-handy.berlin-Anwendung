export const VORVERTRAG_TICKET_STATUS_OPTIONS = [
  'Offen',
  'In Bearbeitung',
  'Erledigt',
  'Bestellen',
  'Zur Abholung bereit'
];

export const VORVERTRAG_TICKET_STATUS_DEFAULT = 'Offen';

const STATUS_ALIASES = {
  offen: 'Offen',
  'in bearbeitung': 'In Bearbeitung',
  'in berbeitung': 'In Bearbeitung',
  erledigt: 'Erledigt',
  'zur abholung bereit': 'Zur Abholung bereit',
  'zur abhohlung bereit': 'Zur Abholung bereit',
  bestellen: 'Bestellen'
};

export function normalizeVorvertragTicketStatus(value) {
  const v = String(value ?? '').trim();
  if (VORVERTRAG_TICKET_STATUS_OPTIONS.includes(v)) return v;
  const aliased = STATUS_ALIASES[v.toLowerCase()];
  if (aliased) return aliased;
  return VORVERTRAG_TICKET_STATUS_DEFAULT;
}

export function isValidVorvertragTicketStatus(value) {
  const v = String(value ?? '').trim();
  if (!v) return false;
  if (VORVERTRAG_TICKET_STATUS_OPTIONS.includes(v)) return true;
  return Boolean(STATUS_ALIASES[v.toLowerCase()]);
}
