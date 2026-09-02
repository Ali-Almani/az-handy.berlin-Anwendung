import { TICKET_PRIORITY_OPTIONS, normalizeTicketPriority } from './ticketPriority';

export default function TicketPriorityField({
  id,
  value,
  onChange,
  required = false,
  questionStyle = false
}) {
  const current = normalizeTicketPriority(value);

  return (
    <div className="form-group">
      <label htmlFor={id} className={`form-label${required ? ' form-label--required' : ''}`}>
        {questionStyle ? 'Priorität?' : 'Priorität'}
      </label>
      <select
        id={id}
        className="form-input"
        value={current}
        onChange={(ev) => onChange?.(ev.target.value)}
        required={required}
        aria-label="Priorität"
      >
        {TICKET_PRIORITY_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
