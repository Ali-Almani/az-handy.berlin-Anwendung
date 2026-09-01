import {
  LEAD_ANGEBOT_OPTIONS,
  LEAD_O2_OPTIONS,
  LEAD_STADT_OPTIONS
} from './callcenterLeadData';

export default function LeadFragenForm({
  answers,
  onChange,
  idPrefix = 'q',
  title = 'Vorlage – Fragen',
  subtitle = '',
  onClose,
  embedded = false
}) {
  const patch = (field, value) => onChange?.(field, value);

  const fields = (
    <div className={embedded ? 'sz-questions-form' : 'lead-fragen-grid'}>
      <div className="form-group">
        <label className="form-label" htmlFor={`${idPrefix}-rufnummer`}>Rufnummer?</label>
        <input
          id={`${idPrefix}-rufnummer`}
          className="form-input"
          type="tel"
          value={answers?.rufnummer || ''}
          onChange={(ev) => patch('rufnummer', ev.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor={`${idPrefix}-o2`}>O2 Kunde?</label>
        <select
          id={`${idPrefix}-o2`}
          className="form-input"
          value={answers?.o2Kunde || ''}
          onChange={(ev) => patch('o2Kunde', ev.target.value)}
        >
          <option value="">—</option>
          {LEAD_O2_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor={`${idPrefix}-angebot`}>Angebot / Produkt?</label>
        <select
          id={`${idPrefix}-angebot`}
          className="form-input"
          value={answers?.angebot || ''}
          onChange={(ev) => patch('angebot', ev.target.value)}
        >
          <option value="">—</option>
          {LEAD_ANGEBOT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor={`${idPrefix}-produkt`}>Produkt Notiz?</label>
        <input
          id={`${idPrefix}-produkt`}
          className="form-input"
          value={answers?.produktNotiz || ''}
          onChange={(ev) => patch('produktNotiz', ev.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor={`${idPrefix}-stadt`}>Stadt?</label>
        <select
          id={`${idPrefix}-stadt`}
          className="form-input"
          value={answers?.stadt || ''}
          onChange={(ev) => patch('stadt', ev.target.value)}
        >
          <option value="">—</option>
          {LEAD_STADT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor={`${idPrefix}-marketing`}>Marketing Notiz?</label>
        <input
          id={`${idPrefix}-marketing`}
          className="form-input"
          value={answers?.marketingNotiz || ''}
          onChange={(ev) => patch('marketingNotiz', ev.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor={`${idPrefix}-datum`}>Termin Datum?</label>
        <input
          id={`${idPrefix}-datum`}
          className="form-input"
          type="date"
          value={answers?.terminDatum || ''}
          onChange={(ev) => patch('terminDatum', ev.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor={`${idPrefix}-zeit`}>Termin Zeit?</label>
        <input
          id={`${idPrefix}-zeit`}
          className="form-input"
          type="time"
          value={answers?.terminZeit || ''}
          onChange={(ev) => patch('terminZeit', ev.target.value)}
        />
      </div>
    </div>
  );

  if (embedded) return fields;

  return (
    <section className="lead-fragen-panel" aria-label={title}>
      <div className="lead-fragen-panel__head">
        <div>
          <h3 className="lead-fragen-panel__title">{title}</h3>
          {subtitle ? <p className="lead-fragen-panel__sub">{subtitle}</p> : null}
        </div>
        {onClose ? (
          <button type="button" className="btn btn--secondary btn--small" onClick={onClose}>
            Fertig
          </button>
        ) : null}
      </div>
      {fields}
    </section>
  );
}
