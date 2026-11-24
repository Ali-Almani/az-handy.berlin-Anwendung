import { useEffect, useMemo, useState } from 'react';
import VorvertragEditLog from './VorvertragEditLog';
import LeadFragenForm from './LeadFragenForm';
import TicketDokumente from './TicketDokumente';
import {
  KONTAKTVERSUCH_MAX,
  berlinCalendarDate,
  berlinClockTime,
  isCustomTicketField,
  kontaktversuchCountFor,
  kontaktversuchDatumKey,
  kontaktversuchGroup,
  kontaktversuchUhrzeitKey,
  kontaktversuchZeitAtKey,
  kontaktversuchZeitKey,
  kontaktversuchZeitValue,
  offenFollowupFieldKeys,
  offenFollowupGroupsForTicket,
  loadQuestionConfig,
  ticketFormAnswers,
  sanitizeMitarbeiterName,
  collectShopMitarbeiterNames,
  storedMitarbeiterNames,
  ensureTicketGeoeffnetAt,
  shopOptionsForTicketing,
  shopOptionLabel,
  normalizeNachrichtShop,
  MANUAL_TICKET_NAME,
  assignShopMitarbeiter,
  assignMitarbeiter,
  missingManualTicketCreateFields
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
    if (!String(draft[zeitAtKey] || '').trim()) {
      merged[zeitAtKey] = now.toISOString();
      draft[zeitAtKey] = merged[zeitAtKey];
    }
    merged[zeitKey] = kontaktversuchZeitValue(merged, group.n, now);
    draft[zeitKey] = merged[zeitKey];
  }
  return draft;
}

function formatOpenedDate(iso) {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return '';
  const ymd = berlinCalendarDate(new Date(parsed));
  const [year, month, day] = ymd.split('-');
  return day && month && year ? `${day}.${month}.${year}` : '';
}

function formatOpenedTime(iso) {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return '';
  return berlinClockTime(new Date(parsed));
}

function draftFromTicket(ticket, bearbeiterName) {
  const draft = followupSnapshot(ticket);
  const name = String(bearbeiterName || '').trim();
  const today = berlinCalendarDate();
  const clock = berlinClockTime();
  const first = kontaktversuchGroup(1).fields.find((field) => field.autoName);
  if (first && name && !String(draft[first.key] || '').trim()) draft[first.key] = name;
  for (const group of offenFollowupGroupsForTicket({ ...ticket, ...draft })) {
    const dateKey = kontaktversuchDatumKey(group.n);
    const timeKey = kontaktversuchUhrzeitKey(group.n);
    if (!String(draft[dateKey] || '').trim()) draft[dateKey] = today;
    if (!String(draft[timeKey] || '').trim()) {
      const storedAt = String(draft[kontaktversuchZeitAtKey(group.n)] || ticket?.[kontaktversuchZeitAtKey(group.n)] || '').trim();
      const parsed = Date.parse(storedAt);
      draft[timeKey] = Number.isFinite(parsed) ? berlinClockTime(new Date(parsed)) : clock;
    }
  }
  return fillAutoKontaktversuchZeit(ticket, draft);
}

function ticketWorkingCopy(ticket, bearbeiterName) {
  const followup = draftFromTicket(ticket, bearbeiterName);
  return {
    ...ticket,
    ...followup,
    geoeffnetAt: String(ticket?.geoeffnetAt || '').trim() || ensureTicketGeoeffnetAt(ticket)
  };
}

export default function LeadNachrichtHistory({
  ticket,
  onClose,
  onCommit,
  editLog = [],
  bearbeiterName = '',
  canDeleteDokumente = false,
  questionConfig: questionConfigProp,
  saving = false,
  canEditStaffNames = false,
  requireCreateFields = false
}) {
  const [working, setWorking] = useState(() => ticketWorkingCopy(ticket, bearbeiterName));
  const [commitBusy, setCommitBusy] = useState(false);
  const [createError, setCreateError] = useState('');
  const questionConfig = questionConfigProp || loadQuestionConfig();

  useEffect(() => {
    setWorking(ticketWorkingCopy(ticket, bearbeiterName));
    setCreateError('');
  }, [ticket?.id, bearbeiterName]);

  const customerName = working?.customerName || working?.rufnummer || 'Kunde';
  const openedAt = String(working?.geoeffnetAt || '').trim() || ensureTicketGeoeffnetAt(working);
  const openedDate = formatOpenedDate(openedAt);
  const openedTime = formatOpenedTime(openedAt);
  const logItems = Array.isArray(editLog) ? editLog : [];
  const answers = useMemo(
    () => ticketFormAnswers(working, questionConfig),
    [working, questionConfig]
  );
  const groups = useMemo(
    () => offenFollowupGroupsForTicket(working),
    [working]
  );
  const shopNames = useMemo(() => collectShopMitarbeiterNames(working), [working]);
  const marketingNames = useMemo(() => storedMitarbeiterNames(working), [working]);
  const filialeOptions = useMemo(() => {
    const shops = shopOptionsForTicketing();
    const current = normalizeNachrichtShop(working?.shop) || String(working?.shop || '').trim();
    return current && !shops.includes(current) ? [current, ...shops] : shops;
  }, [working?.shop]);
  const filialeValue = normalizeNachrichtShop(working?.shop) || String(working?.shop || '').trim();
  const busy = saving || commitBusy;

  const patchWorking = (field, value) => {
    setWorking((prev) => {
      const extra = isCustomTicketField(field)
        ? { customAnswers: { ...(prev.customAnswers || {}), [field]: value } }
        : {};
      if (field === 'rufnummer' && !requireCreateFields) {
        const name = String(prev.customerName || '').trim();
        if (!name || name === MANUAL_TICKET_NAME) {
          extra.customerName = String(value || '').trim() || MANUAL_TICKET_NAME;
        }
      }
      const patched = { ...prev, [field]: value, ...extra };
      if (field === 'shopMitarbeiter') return assignShopMitarbeiter(patched, value);
      if (field === 'mitarbeiterName') return assignMitarbeiter(patched, value);
      return patched;
    });
  };

  const addKontaktversuch = () => {
    const nextN = kontaktversuchCountFor(working) + 1;
    if (nextN > KONTAKTVERSUCH_MAX) return;
    const name = sanitizeMitarbeiterName(bearbeiterName);
    const today = berlinCalendarDate();
    const clock = berlinClockTime();
    const now = new Date();
    const group = kontaktversuchGroup(nextN);
    const zeit = kontaktversuchZeitValue(working, nextN, now);
    const zeitAt = now.toISOString();
    setWorking((prev) => {
      const next = { ...prev, kontaktversuchCount: nextN };
      for (const field of group.fields) {
        if (field.autoName && name) next[field.key] = name;
        else if (field.type === 'date') next[field.key] = today;
        else if (field.type === 'time') next[field.key] = clock;
        else if (field.autoZeit) next[field.key] = zeit;
        else next[field.key] = '';
      }
      next[kontaktversuchZeitAtKey(nextN)] = zeitAt;
      return next;
    });
  };

  const commitAndClose = async () => {
    if (busy) return;
    if (requireCreateFields) {
      const missing = missingManualTicketCreateFields(working);
      if (missing.length) {
        setCreateError(`Bitte ausfüllen: ${missing.join(', ')}`);
        return;
      }
    }
    setCreateError('');
    setCommitBusy(true);
    try {
      await onCommit?.(working);
    } finally {
      setCommitBusy(false);
    }
  };

  return (
    <section className="lead-fragen-panel" aria-label="Ticket bearbeiten">
      <div className="lead-fragen-panel__head">
        <div className="lead-fragen-panel__identity">
          <h3 className="lead-fragen-panel__title">{customerName}</h3>
          <p className="lead-fragen-panel__sub">
            {String(working?.id || '').startsWith('draft-') ? 'Neues Ticket' : working?.id}
          </p>
        </div>
        <div className="lead-fragen-panel__opened">
          <div className="form-group sz-qfield lead-fragen-panel__opened-field">
            <label className="sz-qfield__label" htmlFor="offen-geoeffnet-datum">Datum</label>
            <input
              id="offen-geoeffnet-datum"
              className="form-input"
              value={openedDate}
              readOnly
              aria-label="Datum geöffnetes Ticket"
            />
          </div>
          <div className="form-group sz-qfield lead-fragen-panel__opened-field lead-fragen-panel__opened-field--time">
            <label className="sz-qfield__label" htmlFor="offen-geoeffnet-zeit">Zeit</label>
            <input
              id="offen-geoeffnet-zeit"
              className="form-input"
              value={openedTime}
              readOnly
              aria-label="Zeit geöffnetes Ticket"
            />
          </div>
        </div>
        {canEditStaffNames ? (
          <div className="form-group sz-qfield lead-fragen-panel__bearbeiter">
            <label htmlFor="offen-marketing-mitarbeiter" className="sz-qfield__label">Marketing Mitarbeiter</label>
            <select
              id="offen-marketing-mitarbeiter"
              className="form-input"
              value={sanitizeMitarbeiterName(working?.mitarbeiterName) || ''}
              onChange={(ev) => patchWorking('mitarbeiterName', ev.target.value)}
              disabled={busy}
              aria-label="Marketing Mitarbeiter"
            >
              <option value="">—</option>
              {marketingNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="form-group sz-qfield lead-fragen-panel__bearbeiter">
          <label htmlFor="offen-shop-mitarbeiter" className="sz-qfield__label">Bearbeiter</label>
          {canEditStaffNames ? (
            <select
              id="offen-shop-mitarbeiter"
              className="form-input"
              value={sanitizeMitarbeiterName(working?.shopMitarbeiter) || ''}
              onChange={(ev) => patchWorking('shopMitarbeiter', ev.target.value)}
              disabled={busy}
              aria-label="Bearbeiter"
            >
              <option value="">—</option>
              {shopNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          ) : shopNames.length > 1 ? (
            <select
              id="offen-shop-mitarbeiter"
              className="form-input"
              value={working?.shopMitarbeiter || shopNames[0] || ''}
              onChange={(ev) => patchWorking('shopMitarbeiter', ev.target.value)}
              disabled={busy}
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
              value={working?.shopMitarbeiter || ''}
              onChange={(ev) => patchWorking('shopMitarbeiter', ev.target.value)}
              disabled={busy}
              autoComplete="off"
              aria-label="Bearbeiter"
            />
          )}
        </div>
        <div className="form-group sz-qfield lead-fragen-panel__filiale">
          <label
            htmlFor="offen-ticket-filiale"
            className={`sz-qfield__label${requireCreateFields ? ' form-label--required' : ''}`}
          >
            Filiale
          </label>
          <select
            id="offen-ticket-filiale"
            className="form-input"
            value={filialeValue}
            onChange={(ev) => patchWorking('shop', ev.target.value)}
            disabled={busy}
            aria-label="Filiale"
            required={requireCreateFields}
            aria-required={requireCreateFields || undefined}
          >
            {!filialeValue ? <option value="">Filiale</option> : null}
            {filialeOptions.map((opt) => (
              <option key={opt} value={opt}>{shopOptionLabel(opt)}</option>
            ))}
          </select>
        </div>
        <div className="lead-fragen-panel__actions">
          <button
            type="button"
            className="btn btn--outline btn--small"
            onClick={() => onClose?.()}
            disabled={busy}
          >
            Abbrechen
          </button>
          <button type="button" className="btn btn--secondary btn--small" onClick={commitAndClose} disabled={busy}>
            {busy ? 'Wird gespeichert…' : 'Fertig'}
          </button>
        </div>
      </div>
      {createError ? <p className="vorvertrag-step-required-hint">{createError}</p> : null}
      <h3 className="vorvertrag-section-title">Informationen</h3>
      <LeadFragenForm
        fieldsOnly
        answers={answers}
        onChange={patchWorking}
        questionConfig={questionConfig}
        idPrefix="offen-q"
        showMocKn
        requiredFields={requireCreateFields
          ? ['customerName', 'rufnummer', 'o2Kunde', 'angebot', 'stadt']
          : []}
      />
      <hr className="offen-followup-rule" />
      <TicketDokumente
        ticket={working}
        uploaderName={bearbeiterName}
        canDelete={canDeleteDokumente}
        onDokumenteChange={(docs, hidden) => {
          setWorking((prev) => ({
            ...prev,
            dokumente: docs,
            ...(hidden ? { dokumenteHidden: hidden } : {})
          }));
        }}
      />
      <hr className="offen-followup-rule" />
      {groups.map((group) => (
        <section key={group.title} className="offen-followup">
          <h3 className="vorvertrag-section-title">{group.title}</h3>
          <div className="lead-fragen-grid">
            {group.fields.map((field) => {
              const value = working[field.key] || '';
              const locked = Boolean(field.locked || field.autoZeit);
              const pickerType = !locked && (field.type === 'date' || field.type === 'time') ? field.type : '';
              const inputType = pickerType && value ? pickerType : 'text';
              const input = (
                <input
                  id={`offen-${field.key}`}
                  className="form-input"
                  type={inputType}
                  value={value}
                  readOnly={locked}
                  disabled={locked}
                  inputMode={field.autoZeit ? 'decimal' : undefined}
                  aria-readonly={locked || undefined}
                  aria-label={field.autoZeit ? `${group.title} ${field.label} in Stunden` : `${group.title} ${field.label}`}
                  onFocus={(ev) => {
                    if (pickerType) ev.target.type = pickerType;
                  }}
                  onBlur={(ev) => {
                    if (pickerType && !ev.target.value) ev.target.type = 'text';
                  }}
                  onChange={locked || busy ? undefined : (ev) => patchWorking(field.key, ev.target.value)}
                />
              );
              return (
                <div key={field.key} className="form-group sz-qfield">
                  <label htmlFor={`offen-${field.key}`} className="sz-qfield__label">{field.label}</label>
                  {field.autoZeit ? (
                    <div className="sz-qfield__range">
                      {input}
                      <span>(Std)</span>
                    </div>
                  ) : input}
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
