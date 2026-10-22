export const VORVERTRAG_TICKET_STATUS_OPTIONS = [
  'Offen',
  'Nicht erreicht',
  'Kundenrückmeldung',
  'Kundenbesuch',
  'Boni Ticket',
  'Bestellung',
  'Abholbereit',
  'Erledigt'
];

export const VORVERTRAG_TICKET_STATUS_DEFAULT = 'Offen';

const STATUS_ALIASES = {
  offen: 'Offen',
  'nicht erreicht': 'Nicht erreicht',
  kundenrueckmeldung: 'Kundenrückmeldung',
  'kundenrückmeldung': 'Kundenrückmeldung',
  kundenbesuch: 'Kundenbesuch',
  'boni ticket': 'Boni Ticket',
  'bonus ticket': 'Boni Ticket',
  bestellung: 'Bestellung',
  bestellen: 'Bestellung',
  abholbereit: 'Abholbereit',
  'zur abholung bereit': 'Abholbereit',
  'zur abhohlung bereit': 'Abholbereit',
  erledigt: 'Erledigt',
  'in bearbeitung': 'Offen',
  'in berbeitung': 'Offen'
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
  if (s === 'Abholbereit') return 'pickup';
  if (s === 'Bestellung') return 'bestellen';
  if (s === 'Offen') return 'open';
  return 'order';
}
