import { TICKET_LANGUAGE_OPTIONS, normalizeTicketLanguage } from './ticketLanguage';

function selectedOption(value, options, normalize) {
  const raw = String(value ?? '').trim();
  if (options.includes(raw)) return raw;
  const normalized = normalize(value);
  if (options.includes(normalized)) return normalized;
  return options[0] || '';
}

export default function TicketLanguageField({
  id,
  value,
  onChange,
  required = false,
  questionStyle = false,
  label,
  options
}) {
  const choices = Array.isArray(options) && options.length ? options : TICKET_LANGUAGE_OPTIONS;
  const current = selectedOption(value, choices, normalizeTicketLanguage);

  const shownLabel = String(label || 'Sprache').replace(/\?+$/, '');

  return (
    <div className={`form-group${questionStyle ? ' sz-qfield' : ''}`}>
      <label
        htmlFor={id}
        className={questionStyle ? 'sz-qfield__label' : `form-label${required ? ' form-label--required' : ''}`}
      >
        {shownLabel}
      </label>
      <select
        id={id}
        className="form-input"
        value={questionStyle && !String(value ?? '').trim() ? '' : current}
        onChange={(ev) => onChange?.(ev.target.value)}
        required={required}
        aria-label={shownLabel}
      >
        {questionStyle ? <option value="" /> : null}
        {choices.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
