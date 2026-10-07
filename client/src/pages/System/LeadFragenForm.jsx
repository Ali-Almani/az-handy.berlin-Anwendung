import { useState } from 'react';
import VorvertragEditLog from './VorvertragEditLog';
import {
  LEAD_ANGEBOT_OPTIONS,
  LEAD_O2_OPTIONS,
  isQuestionHidden,
  looksLikePhoneNumber,
  telHrefFromPhone,
  templateQuestionText,
  whatsappHrefFromPhone
} from './callcenterLeadData';
import TicketPriorityField from './TicketPriorityField';
import TicketLanguageField from './TicketLanguageField';
import StadtPicker from './StadtPicker';

function QuestionTools({ onEdit, onDelete, editing }) {
  return (
    <div className="sz-question-tools">
      <button
        type="button"
        className="sz-question-icon"
        onClick={onEdit}
        aria-label={editing ? 'Frage speichern' : 'Frage aktualisieren'}
        title={editing ? 'Speichern' : 'Aktualisieren'}
      >
        {editing ? (
          <svg viewBox="0 0 24 24" aria-hidden>
            <path fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden>
            <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
        )}
      </button>
      <button
        type="button"
        className="sz-question-icon sz-question-icon--delete"
        onClick={onDelete}
        aria-label="Frage löschen"
        title="Löschen"
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
        </svg>
      </button>
    </div>
  );
}

function QuestionShell({
  field,
  fallbackLabel,
  locale,
  config,
  hasText = false,
  onDelete,
  onUpdate,
  children
}) {
  const manageable = Boolean(onDelete && onUpdate);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState('');
  const [text, setText] = useState('');
  if (manageable && isQuestionHidden(config, field)) return null;

  const shownLabel = config?.labels?.[field]?.[locale] || fallbackLabel;
  const shownText = config?.texts?.[field]?.[locale] || templateQuestionText(field, locale);

  const startEdit = () => {
    setLabel(shownLabel);
    setText(shownText);
    setEditing(true);
  };

  const saveEdit = () => {
    const nextLabel = label.trim();
    if (!nextLabel) return;
    onUpdate?.(field, {
      label: nextLabel,
      text: hasText ? text.trim() : undefined
    });
    setEditing(false);
  };

  return (
    <div className={manageable ? 'sz-question' : undefined}>
      {manageable ? (
        <QuestionTools
          editing={editing}
          onEdit={editing ? saveEdit : startEdit}
          onDelete={() => onDelete(field, shownLabel)}
        />
      ) : null}
      {editing ? (
        <div className="sz-question-edit">
          <label className="form-label" htmlFor={`edit-label-${field}`}>Bezeichnung</label>
          <input
            id={`edit-label-${field}`}
            className="form-input"
            value={label}
            onChange={(ev) => setLabel(ev.target.value)}
          />
          {hasText ? (
            <>
              <label className="form-label" htmlFor={`edit-text-${field}`}>Fragentext</label>
              <input
                id={`edit-text-${field}`}
                className="form-input"
                value={text}
                onChange={(ev) => setText(ev.target.value)}
              />
            </>
          ) : null}
        </div>
      ) : null}
      {children(shownLabel)}
    </div>
  );
}

export default function LeadFragenForm({
  answers,
  onChange,
  idPrefix = 'q',
  title = 'Vorlage – Fragen',
  subtitle = '',
  onClose,
  embedded = false,
  fieldsOnly = false,
  editLog = [],
  questionConfig = null,
  questionLocale = 'de',
  onQuestionDelete,
  onQuestionUpdate
}) {
  const patch = (field, value) => onChange?.(field, value);
  const contactTel = embedded ? telHrefFromPhone(answers?.rufnummer) : null;
  const contactWa = embedded ? whatsappHrefFromPhone(answers?.rufnummer) : null;
  const showContactActions = embedded && looksLikePhoneNumber(answers?.rufnummer) && (contactTel || contactWa);

  const shell = (field, fallbackLabel, hasText, node) => (
    <QuestionShell
      key={field}
      field={field}
      fallbackLabel={fallbackLabel}
      locale={questionLocale}
      config={questionConfig}
      hasText={hasText}
      onDelete={onQuestionDelete}
      onUpdate={onQuestionUpdate}
    >
      {node}
    </QuestionShell>
  );

  const fields = (
    <div className={embedded ? 'sz-questions-form' : 'lead-fragen-grid'}>
      {shell('priority', 'Priorität?', false, (label) => (
        <TicketPriorityField
          id={`${idPrefix}-priority`}
          value={answers?.priority}
          onChange={(value) => patch('priority', value)}
          questionStyle
          label={label}
        />
      ))}
      {shell('sprache', 'Sprache?', false, (label) => (
        <TicketLanguageField
          id={`${idPrefix}-sprache`}
          value={answers?.sprache}
          onChange={(value) => patch('sprache', value)}
          questionStyle
          label={label}
        />
      ))}
      {shell('rufnummer', 'Rufnummer?', true, (label) => (
      <div className="form-group">
        <label className="form-label" htmlFor={`${idPrefix}-rufnummer`}>{label}</label>
        <div className={embedded ? 'sz-rufnummer-row' : undefined}>
          <input
            id={`${idPrefix}-rufnummer`}
            className="form-input"
            type="tel"
            value={answers?.rufnummer || ''}
            onChange={(ev) => patch('rufnummer', ev.target.value)}
          />
          {showContactActions ? (
            <div className="sz-contact-actions sz-contact-actions--inline">
              {contactTel ? (
                <a href={contactTel} className="sz-contact-btn sz-contact-btn--call">
                  Anruf
                </a>
              ) : null}
              {contactWa ? (
                <a
                  href={contactWa}
                  className="sz-contact-btn sz-contact-btn--whatsapp"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      ))}
      {shell('o2Kunde', 'O2 Kunde?', true, (label) => (
      <div className="form-group">
        <label className="form-label" htmlFor={`${idPrefix}-o2`}>{label}</label>
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
      ))}
      {shell('angebot', 'Angebot / Produkt?', true, (label) => (
      <div className="form-group">
        <label className="form-label" htmlFor={`${idPrefix}-angebot`}>{label}</label>
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
      ))}
      {shell('produktNotiz', 'Produkt Notiz?', true, (label) => (
      <div className="form-group">
        <label className="form-label" htmlFor={`${idPrefix}-produkt`}>{label}</label>
        <input
          id={`${idPrefix}-produkt`}
          className="form-input"
          value={answers?.produktNotiz || ''}
          onChange={(ev) => patch('produktNotiz', ev.target.value)}
        />
      </div>
      ))}
      {shell('stadt', 'Stadt?', true, (label) => (
      <StadtPicker
        id={`${idPrefix}-stadt`}
        label={label}
        value={answers?.stadt || ''}
        onChange={(value) => patch('stadt', value)}
      />
      ))}
      {shell('marketingNotiz', 'Marketing Notiz?', true, (label) => (
      <div className="form-group">
        <label className="form-label" htmlFor={`${idPrefix}-marketing`}>{label}</label>
        <input
          id={`${idPrefix}-marketing`}
          className="form-input"
          value={answers?.marketingNotiz || ''}
          onChange={(ev) => patch('marketingNotiz', ev.target.value)}
        />
      </div>
      ))}
      {shell('terminDatum', 'Termin Datum?', true, (label) => (
      <div className="form-group">
        <label className="form-label" htmlFor={`${idPrefix}-datum`}>{label}</label>
        <input
          id={`${idPrefix}-datum`}
          className="form-input"
          type="date"
          value={answers?.terminDatum || ''}
          onChange={(ev) => patch('terminDatum', ev.target.value)}
        />
      </div>
      ))}
      {shell('terminZeit', 'Termin Zeit?', true, (label) => (
      <div className="form-group">
        <label className="form-label" htmlFor={`${idPrefix}-zeit`}>{label}</label>
        <input
          id={`${idPrefix}-zeit`}
          className="form-input"
          type="time"
          value={answers?.terminZeit || ''}
          onChange={(ev) => patch('terminZeit', ev.target.value)}
        />
      </div>
      ))}
    </div>
  );

  if (embedded || fieldsOnly) return fields;

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
      <VorvertragEditLog items={editLog} />
    </section>
  );
}
