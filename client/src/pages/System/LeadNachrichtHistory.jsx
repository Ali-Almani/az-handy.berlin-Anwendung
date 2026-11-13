import { useEffect, useMemo, useState } from 'react';
import VorvertragEditLog from './VorvertragEditLog';
import LeadFragenForm from './LeadFragenForm';
import TicketDokumente from './TicketDokumente';
import {
  KONTAKTVERSUCH_MAX,
  berlinCalendarDate,
  kontaktversuchBearbeiterKey,
  kontaktversuchCountFor,
  kontaktversuchDatumKey,
  kontaktversuchGroup,
  kontaktversuchZeitAtKey,
  kontaktversuchZeitKey,
  kontaktversuchZeitValue,
  offenFollowupFieldKeys,
  offenFollowupGroupsForTicket,
  loadQuestionConfig,
  ticketFormAnswers,
  sanitizeMitarbeiterName,
  collectShopMitarbeiterNames,
  ensureTicketGeoeffnetAt
} from './callcenterLeadData';

function followupSnapshot(ticket) {
  const snapshot = { kontaktversuchCount: kontaktversuchCountFor(ticket) };
  for (const key of offenFollowupFieldKeys(ticket)) {
    snapshot[key] = ticket?.[key] || '';
  }
  return snapshot;
}

function fillAutoKontaktversuchZeit(ticket, draft, now = new Date()) {
  const merged = { ...ticket, ...draft };
  for (const group of offenFollowupGroupsForTicket(merged)) {
    const zeitKey = kontaktversuchZeitKey(group.n);
    const zeitAtKey = kontaktversuchZeitAtKey(group.n);
    if (String(draft[zeitKey] || '').trim()) continue;
    merged[zeitKey] = kontaktversuchZeitValue(merged, group.n, now);
    if (!String(draft[zeitAtKey] || '').trim()) merged[zeitAtKey] = now.toISOString();
    draft[zeitKey] = merged[zeitKey];
    draft[zeitAtKey] = merged[zeitAtKey];
  }
  return draft;
}

function draftFromTicket(ticket, bearbeiterName) {
  const draft = followupSnapshot(ticket);
  const name = String(bearbeiterName || '').trim();
  const today = berlinCalendarDate();
  const first = kontaktversuchGroup(1).fields.find((field) => field.autoName);
  if (first && name && !String(draft[first.key] || '').trim()) draft[first.key] = name;
  for (const group of offenFollowupGroupsForTicket({ ...ticket, ...draft })) {
    const dateKey = kontaktversuchDatumKey(group.n);
    if (!String(draft[dateKey] || '').trim()) draft[dateKey] = today;
  }
  return fillAutoKontaktversuchZeit(ticket, draft);
}

export default function LeadNachrichtHistory({
  ticket,
  onClose,
  editLog = [],
  onAnswerChange,
  bearbeiterName = '',
  canDeleteDokumente = false
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
  const groups = useMemo(
    () => offenFollowupGroupsForTicket({ ...ticket, ...draft }),
    [ticket, draft]
  );
  const shopNames = useMemo(() => collectShopMitarbeiterNames(ticket), [ticket]);

  useEffect(() => {
    setSaved(followupSnapshot(ticket));
    setDraft(draftFromTicket(ticket, bearbeiterName));
  }, [ticket?.id, bearbeiterName]);

  useEffect(() => {
    const name = sanitizeMitarbeiterName(bearbeiterName);
    if (!name) return;
    if (collectShopMitarbeiterNames(ticket).includes(name)) return;
    onAnswerChange?.('shopMitarbeiter', name);
  }, [ticket?.id, bearbeiterName]);

  useEffect(() => {
    if (String(ticket?.geoeffnetAt || '').trim()) return;
    onAnswerChange?.('geoeffnetAt', ensureTicketGeoeffnetAt(ticket));
  }, [ticket?.id]);

  const addKontaktversuch = () => {
    const nextN = kontaktversuchCountFor({ ...ticket, ...draft }) + 1;
    if (nextN > KONTAKTVERSUCH_MAX) return;
    const name = sanitizeMitarbeiterName(bearbeiterName);
    const today = berlinCalendarDate();
    const now = new Date();
    const group = kontaktversuchGroup(nextN);
    const zeit = kontaktversuchZeitValue({ ...ticket, ...draft }, nextN, now);
    const zeitAt = now.toISOString();
    setDraft((prev) => {
      const next = { ...prev, kontaktversuchCount: nextN };
      for (const field of group.fields) {
        if (field.autoName && name) next[field.key] = name;
        else if (field.type === 'date') next[field.key] = today;
        else if (field.autoZeit) next[field.key] = zeit;
        else next[field.key] = '';
      }
      next[kontaktversuchZeitAtKey(nextN)] = zeitAt;
      return next;
    });
    onAnswerChange?.('kontaktversuchCount', nextN);
    if (name) onAnswerChange?.(kontaktversuchBearbeiterKey(nextN), name);
    onAnswerChange?.(kontaktversuchDatumKey(nextN), today);
    onAnswerChange?.(kontaktversuchZeitKey(nextN), zeit);
    onAnswerChange?.(kontaktversuchZeitAtKey(nextN), zeitAt);
  };

  const commitAndClose = () => {
    const merged = { ...ticket, ...draft };
    const keys = new Set([...offenFollowupFieldKeys(merged), 'kontaktversuchCount']);
    for (const key of keys) {
      if (String(draft[key] ?? '') === String(saved[key] ?? '')) continue;
      onAnswerChange?.(key, draft[key] ?? '');
    }
    onClose?.();
  };

  return (
    <section className="lead-fragen-panel" aria-label="Ticket bearbeiten">
      <div className="lead-fragen-panel__head">
        <div className="lead-fragen-panel__identity">
          <h3 className="lead-fragen-panel__title">{customerName}</h3>
          <p className="lead-fragen-panel__sub">
            {ticket?.id}
          </p>
        </div>
        <div className="form-group sz-qfield lead-fragen-panel__bearbeiter">
          <label htmlFor="offen-shop-mitarbeiter" className="sz-qfield__label">Bearbeiter</label>
          {shopNames.length > 1 ? (
            <select
              id="offen-shop-mitarbeiter"
              className="form-input"
              value={ticket?.shopMitarbeiter || shopNames[0]}
              onChange={(ev) => onAnswerChange?.('shopMitarbeiter', ev.target.value)}
              aria-label="Bearbeiter"
            >
              {shopNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          ) : (
            <input
              id="offen-shop-mitarbeiter"
              className="form-input"
              value={ticket?.shopMitarbeiter || ''}
              onChange={(ev) => onAnswerChange?.('shopMitarbeiter', ev.target.value)}
              autoComplete="off"
              aria-label="Bearbeiter"
            />
          )}
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
      <LeadFragenForm
        fieldsOnly
        answers={answers}
        onChange={onAnswerChange}
        questionConfig={questionConfig}
        idPrefix="offen-q"
        showMocKn
      />
      <hr className="offen-followup-rule" />
      <TicketDokumente
        ticket={ticket}
        uploaderName={bearbeiterName}
        canDelete={canDeleteDokumente}
        onDokumenteChange={(docs, hidden) => {
          onAnswerChange?.('dokumente', docs);
          if (hidden) onAnswerChange?.('dokumenteHidden', hidden);
        }}
      />
      <hr className="offen-followup-rule" />
      {groups.map((group) => (
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
                    readOnly={Boolean(field.autoZeit)}
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
      {groups.length < KONTAKTVERSUCH_MAX ? (
        <div className="offen-followup-add">
          <button
            type="button"
            className="btn btn--outline btn--small"
            onClick={addKontaktversuch}
          >
            Kontaktversuch erstellen
          </button>
        </div>
      ) : null}
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
