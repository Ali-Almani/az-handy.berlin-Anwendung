import VorvertragEditLog from './VorvertragEditLog';
import LeadFragenForm from './LeadFragenForm';
import { formFromLead, OFFEN_FOLLOWUP_GROUPS } from './callcenterLeadData';

export default function LeadNachrichtHistory({ ticket, onClose, editLog = [], onAnswerChange }) {
  const customerName = ticket?.customerName || ticket?.rufnummer || 'Kunde';
  const logItems = Array.isArray(editLog) ? editLog : [];

  return (
    <section className="lead-fragen-panel" aria-label="Ticket bearbeiten">
      <div className="lead-fragen-panel__head">
        <div>
          <h3 className="lead-fragen-panel__title">{customerName}</h3>
          <p className="lead-fragen-panel__sub">
            {ticket?.id}
          </p>
        </div>
        {onClose ? (
          <button type="button" className="btn btn--secondary btn--small" onClick={onClose}>
            Fertig
          </button>
        ) : null}
      </div>
      <h3 className="vorvertrag-section-title">Informationen</h3>
      <LeadFragenForm
        fieldsOnly
        answers={formFromLead(ticket)}
        onChange={onAnswerChange}
        idPrefix="offen-q"
      />
      {OFFEN_FOLLOWUP_GROUPS.map((group) => (
        <section key={group.title} className="offen-followup">
          <h3 className="vorvertrag-section-title">{group.title}</h3>
          <div className="lead-fragen-grid">
            {group.fields.map((field) => {
              const value = ticket?.[field.key] || '';
              const inputType = field.type === 'date' && value ? 'date' : 'text';
              return (
                <label key={field.key} className="form-group">
                  <span className="form-label">{field.label}</span>
                  <input
                    className="form-input"
                    type={inputType}
                    value={value}
                    aria-label={`${group.title} ${field.label}`}
                    onFocus={(ev) => {
                      if (field.type === 'date') ev.target.type = 'date';
                    }}
                    onBlur={(ev) => {
                      if (field.type === 'date' && !ev.target.value) ev.target.type = 'text';
                    }}
                    onChange={(ev) => onAnswerChange?.(field.key, ev.target.value)}
                  />
                </label>
              );
            })}
          </div>
        </section>
      ))}
      {logItems.length > 0 ? (
        <VorvertragEditLog items={logItems} />
      ) : (
        <section className="vorvertrag-edit-log" aria-label="Bearbeitungslog">
          <h3 className="vorvertrag-section-title">Bearbeitungslog</h3>
          <p className="vorvertrag-edit-log__empty">Noch keine Änderungen.</p>
        </section>
      )}
    </section>
  );
}
