export const VORVERTRAG_TICKET_STATUS_OPTIONS = ['In Bearbeitung', 'Erledigt'];

export const VORVERTRAG_TICKET_STATUS_DEFAULT = 'In Bearbeitung';

export function normalizeVorvertragTicketStatus(value) {
  const v = String(value ?? '').trim();
  if (v === 'Erledigt') return 'Erledigt';
  return VORVERTRAG_TICKET_STATUS_DEFAULT;
}

export function isValidVorvertragTicketStatus(value) {
  return VORVERTRAG_TICKET_STATUS_OPTIONS.includes(normalizeVorvertragTicketStatus(value));
}
