import { useEffect, useRef } from 'react';
import VorvertragEditLog from './VorvertragEditLog';
import LeadFragenForm from './LeadFragenForm';
import { formFromLead, OFFEN_FOLLOWUP_GROUPS } from './callcenterLeadData';

export default function LeadNachrichtHistory({
  ticket,
  onClose,
  editLog = [],
  onAnswerChange,
  onClearFields,
  bearbeiterName = ''
}) {
  const customerName = ticket?.customerName || ticket?.rufnummer || 'Kunde';
  const logItems = Array.isArray(editLog) ? editLog : [];
  const filledForTicket = useRef('');
  const attemptFields = useRef([]);

  useEffect(() => {
    const name = String(bearbeiterName || '').trim();
    if (!ticket?.id || !name || filledForTicket.current === ticket.id) return;
    const next = OFFEN_FOLLOWUP_GROUPS
      .flatMap((group) => group.fields)
      .find((field) => field.autoName && !String(ticket[field.key] || '').trim());
    const group = next
      ? OFFEN_FOLLOWUP_GROUPS.find((item) => item.fields.some((field) => field.key === next.key))
      : [...OFFEN_FOLLOWUP_GROUPS].reverse().find((item) =>
        item.fields.some((field) => String(ticket[field.key] || '').trim())
      );
    attemptFields.current = (group || OFFEN_FOLLOWUP_GROUPS[OFFEN_FOLLOWUP_GROUPS.length - 1])
      .fields.map((field) => field.key);
    filledForTicket.current = ticket.id;
    if (next) onAnswerChange?.(next.key, name);
  }, [ticket, bearbeiterName, onAnswerChange]);

  return (
    <section className="lead-fragen-panel" aria-label="Ticket bearbeiten">
      <div className="lead-fragen-panel__head">
        <div>
          <h3 className="lead-fragen-panel__title">{customerName}</h3>
          <p className="lead-fragen-panel__sub">
            {ticket?.id}
          </p>
        </div>
        <div className="lead-fragen-panel__actions">
          <button
            type="button"
            className="btn btn--outline btn--small"
            onClick={() => onClearFields?.(attemptFields.current)}
          >
            Abbrechen
          </button>
          {onClose ? (
            <button type="button" className="btn btn--secondary btn--small" onClick={onClose}>
              Fertig
            </button>
          ) : null}
        </div>
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
                <div key={field.key} className="form-group">
                  <input
                    className="form-input"
                    type={inputType}
                    value={value}
                    placeholder={field.label}
                    aria-label={`${group.title} ${field.label}`}
                    onFocus={(ev) => {
                      if (field.type === 'date') ev.target.type = 'date';
                    }}
                    onBlur={(ev) => {
                      if (field.type === 'date' && !ev.target.value) ev.target.type = 'text';
                    }}
                    onChange={(ev) => onAnswerChange?.(field.key, ev.target.value)}
                  />
                </div>
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
