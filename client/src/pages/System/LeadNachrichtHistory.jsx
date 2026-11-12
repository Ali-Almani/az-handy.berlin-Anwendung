import { useEffect, useMemo, useState } from 'react';
import VorvertragEditLog from './VorvertragEditLog';
import LeadFragenForm from './LeadFragenForm';
import {
  OFFEN_FOLLOWUP_GROUPS,
  offenFollowupFieldKeys,
  loadQuestionConfig,
  ticketFormAnswers,
  sanitizeMitarbeiterName
} from './callcenterLeadData';

function followupSnapshot(ticket) {
  const snapshot = {};
  for (const key of offenFollowupFieldKeys()) {
    snapshot[key] = ticket?.[key] || '';
  }
  return snapshot;
}

function draftFromTicket(ticket, bearbeiterName) {
  const draft = followupSnapshot(ticket);
  const name = String(bearbeiterName || '').trim();
  if (!name) return draft;
  const next = OFFEN_FOLLOWUP_GROUPS
    .flatMap((group) => group.fields)
    .find((field) => field.autoName && !String(draft[field.key] || '').trim());
  if (next) draft[next.key] = name;
  return draft;
}

export default function LeadNachrichtHistory({
  ticket,
  onClose,
  editLog = [],
  onAnswerChange,
  bearbeiterName = ''
}) {
  const customerName = ticket?.customerName || ticket?.rufnummer || 'Kunde';
  const logItems = Array.isArray(editLog) ? editLog : [];
  const questionConfig = useMemo(() => loadQuestionConfig(), [ticket?.id]);
  const answers = useMemo(
    () => ticketFormAnswers(ticket, questionConfig),
    [ticket, questionConfig]
  );
  const [saved, setSaved] = useState(() => followupSnapshot(ticket));
  const [draft, setDraft] = useState(() => draftFromTicket(ticket, bearbeiterName));

  useEffect(() => {
    setSaved(followupSnapshot(ticket));
    setDraft(draftFromTicket(ticket, bearbeiterName));
  }, [ticket?.id, bearbeiterName]);

  useEffect(() => {
    const name = sanitizeMitarbeiterName(bearbeiterName);
    if (!name || sanitizeMitarbeiterName(ticket?.shopMitarbeiter)) return;
    onAnswerChange?.('shopMitarbeiter', name);
  }, [ticket?.id, bearbeiterName]);

  const commitAndClose = () => {
    for (const key of offenFollowupFieldKeys()) {
      if (String(draft[key] || '') === String(saved[key] || '')) continue;
      onAnswerChange?.(key, draft[key] || '');
    }
    onClose?.();
  };

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
            onClick={() => onClose?.()}
          >
            Abbrechen
          </button>
          {onClose ? (
            <button type="button" className="btn btn--secondary btn--small" onClick={commitAndClose}>
              Fertig
            </button>
          ) : null}
        </div>
      </div>
      <h3 className="vorvertrag-section-title">Informationen</h3>
      <div className="lead-fragen-grid">
        <div className="form-group sz-qfield">
          <label htmlFor="offen-shop-mitarbeiter" className="sz-qfield__label">Shop Mitarbeiter</label>
          <input
            id="offen-shop-mitarbeiter"
            className="form-input"
            value={ticket?.shopMitarbeiter || ''}
            onChange={(ev) => onAnswerChange?.('shopMitarbeiter', ev.target.value)}
            autoComplete="off"
            aria-label="Shop Mitarbeiter"
          />
        </div>
      </div>
      <LeadFragenForm
        fieldsOnly
        answers={answers}
        onChange={onAnswerChange}
        questionConfig={questionConfig}
        idPrefix="offen-q"
      />
      {OFFEN_FOLLOWUP_GROUPS.map((group) => (
        <section key={group.title} className="offen-followup">
          <h3 className="vorvertrag-section-title">{group.title}</h3>
          <div className="lead-fragen-grid">
            {group.fields.map((field) => {
              const value = draft[field.key] || '';
              const inputType = field.type === 'date' && value ? 'date' : 'text';
              return (
                <div key={field.key} className="form-group sz-qfield">
                  <label htmlFor={`offen-${field.key}`} className="sz-qfield__label">{field.label}</label>
                  <input
                    id={`offen-${field.key}`}
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
                    onChange={(ev) => setDraft((prev) => ({ ...prev, [field.key]: ev.target.value }))}
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
