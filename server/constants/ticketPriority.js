export const TICKET_PRIORITY_OPTIONS = ['Normal', 'Hoch', 'Dringend'];

export const TICKET_PRIORITY_DEFAULT = 'Normal';

const PRIORITY_ALIASES = {
  niedrig: 'Normal',
  low: 'Normal',
  normal: 'Normal',
  mittel: 'Normal',
  medium: 'Normal',
  hoch: 'Hoch',
  high: 'Hoch',
  dringend: 'Dringend',
  urgent: 'Dringend',
  kritisch: 'Dringend'
};

export function normalizeTicketPriority(value) {
  const v = String(value ?? '').trim();
  if (TICKET_PRIORITY_OPTIONS.includes(v)) return v;
  return PRIORITY_ALIASES[v.toLowerCase()] || TICKET_PRIORITY_DEFAULT;
}
