export const VORVERTRAG_TICKET_STATUS_OPTIONS = ['In Bearbeitung', 'Erledigt'];

export const VORVERTRAG_TICKET_STATUS_DEFAULT = 'In Bearbeitung';

export function normalizeVorvertragTicketStatus(value) {
  const v = String(value ?? '').trim();
  if (v === 'Erledigt') return 'Erledigt';
  return VORVERTRAG_TICKET_STATUS_DEFAULT;
}

export function isVorvertragArchived(entry) {
  return normalizeVorvertragTicketStatus(entry?.ticketStatus) === 'Erledigt';
}

export function vorvertragTicketStatusBadge(status) {
  const s = normalizeVorvertragTicketStatus(status);
  return s === 'Erledigt' ? 'yes' : 'order';
}
