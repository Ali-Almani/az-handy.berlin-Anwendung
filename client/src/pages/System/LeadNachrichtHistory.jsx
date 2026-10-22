import { useEffect, useRef } from 'react';
import VorvertragEditLog from './VorvertragEditLog';
import LeadFragenForm from './LeadFragenForm';
import { formFromLead, OFFEN_KUNDENBESUCH_FIELDS } from './callcenterLeadData';

export default function LeadNachrichtHistory({ ticket, onClose, editLog = [], onAnswerChange, bearbeiterName = '' }) {
  const customerName = ticket?.customerName || ticket?.rufnummer || 'Kunde';
  const logItems = Array.isArray(editLog) ? editLog : [];
  const filledForTicket = useRef('');

  useEffect(() => {
    const name = String(bearbeiterName || '').trim();
    if (!ticket?.id || !name || filledForTicket.current === ticket.id) return;
    filledForTicket.current = ticket.id;
    OFFEN_KUNDENBESUCH_FIELDS.forEach((field) => {
      if (!String(ticket[field.key] || '').trim()) onAnswerChange?.(field.key, name);
    });
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
      <div className="lead-fragen-grid offen-followup">
        {OFFEN_KUNDENBESUCH_FIELDS.map((field) => (
          <div key={field.key} className="form-group">
            <input
              className="form-input"
              type="text"
              value={ticket?.[field.key] || ''}
              placeholder={field.placeholder}
              aria-label={field.placeholder}
              onChange={(ev) => onAnswerChange?.(field.key, ev.target.value)}
            />
          </div>
        ))}
      </div>
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
