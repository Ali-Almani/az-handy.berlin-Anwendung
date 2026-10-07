import { TICKET_PRIORITY_OPTIONS, normalizeTicketPriority } from './ticketPriority';

function selectedOption(value, options, normalize) {
  const raw = String(value ?? '').trim();
  if (options.includes(raw)) return raw;
  const normalized = normalize(value);
  if (options.includes(normalized)) return normalized;
  return options[0] || '';
}

export default function TicketPriorityField({
  id,
  value,
  onChange,
  required = false,
  questionStyle = false,
  label,
  options
}) {
  const choices = Array.isArray(options) && options.length ? options : TICKET_PRIORITY_OPTIONS;
  const current = selectedOption(value, choices, normalizeTicketPriority);

  return (
    <div className="form-group">
      <label htmlFor={id} className={`form-label${required ? ' form-label--required' : ''}`}>
        {label || (questionStyle ? 'Priorität?' : 'Priorität')}
      </label>
      <select
        id={id}
        className="form-input"
        value={current}
        onChange={(ev) => onChange?.(ev.target.value)}
        required={required}
        aria-label="Priorität"
      >
        {choices.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
