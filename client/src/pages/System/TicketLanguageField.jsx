import { TICKET_LANGUAGE_OPTIONS, normalizeTicketLanguage } from './ticketLanguage';

export default function TicketLanguageField({
  id,
  value,
  onChange,
  required = false,
  questionStyle = false
}) {
  const current = normalizeTicketLanguage(value);

  return (
    <div className="form-group">
      <label htmlFor={id} className={`form-label${required ? ' form-label--required' : ''}`}>
        {questionStyle ? 'Sprache?' : 'Sprache'}
      </label>
      <select
        id={id}
        className="form-input"
        value={current}
        onChange={(ev) => onChange?.(ev.target.value)}
        required={required}
        aria-label="Sprache"
      >
        {TICKET_LANGUAGE_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
