export const VORVERTRAG_TICKET_STATUS_OPTIONS = [
  'Offen',
  'In Bearbeitung',
  'Bestellen',
  'Zur Abholung bereit',
  'Erledigt'
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

export function isVorvertragArchived(entry) {
  return normalizeVorvertragTicketStatus(entry?.ticketStatus) === 'Erledigt';
}

export function vorvertragTicketStatusBadge(status) {
  const s = normalizeVorvertragTicketStatus(status);
  if (s === 'Erledigt') return 'yes';
  if (s === 'Zur Abholung bereit') return 'pickup';
  if (s === 'Bestellen') return 'bestellen';
  if (s === 'Offen') return 'open';
  return 'order';
}
