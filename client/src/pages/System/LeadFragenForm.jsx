import { useEffect, useState } from 'react';
import VorvertragEditLog from './VorvertragEditLog';
import {
  questionDropdownOptions,
  templateQuestionText,
  visibleQuestionOrder
} from './callcenterLeadData';
import TicketPriorityField from './TicketPriorityField';
import TicketLanguageField from './TicketLanguageField';
import StadtPicker from './StadtPicker';

const FIELD_META = {
  priority: { label: 'Priorität?', hasText: false },
  sprache: { label: 'Sprache?', hasText: false },
  rufnummer: { label: 'Rufnummer?', hasText: true },
  o2Kunde: { label: 'O2 Kunde?', hasText: true },
  angebot: { label: 'Angebot / Produkt?', hasText: true },
  produktNotiz: { label: 'Produkt Notiz?', hasText: true },
  stadt: { label: 'Stadt?', hasText: true },
  marketingNotiz: { label: 'Marketing Notiz?', hasText: true },
  terminDatum: { label: 'Termin Datum?', hasText: true },
  terminZeit: { label: 'Termin Zeit?', hasText: true }
};

function OptionsEditor({ options, onCommit }) {
  const joined = options.join('\n');
  const [value, setValue] = useState(joined);

  useEffect(() => {
    setValue(joined);
  }, [joined]);

  return (
    <textarea
      className="form-input sz-template-options"
      rows={Math.min(6, Math.max(2, value.split('\n').length))}
      value={value}
      onChange={(ev) => setValue(ev.target.value)}
      onBlur={() => onCommit(value.split('\n').map((line) => line.trim()).filter(Boolean))}
    />
  );
}

function TemplateEditor({ config, locale, onUpdate, onDelete, onMove }) {
  const order = visibleQuestionOrder(config);
  return (
    <div className="sz-template-edit">
      {order.map((field, index) => {
        const meta = FIELD_META[field];
        if (!meta) return null;
        const label = config?.labels?.[field]?.[locale] || meta.label;
        const text = config?.texts?.[field]?.[locale] || templateQuestionText(field, locale);
        const options = questionDropdownOptions(field, config);
        const save = (patch) => onUpdate?.(field, {
          label: patch.label ?? label,
          text: meta.hasText ? (patch.text ?? text) : undefined,
          options: patch.options
        });
        return (
          <div key={field} className="sz-template-item">
            <div className="sz-template-item__bar">
              <button
                type="button"
                className="sz-question-icon"
                onClick={() => onMove?.(field, -1)}
                disabled={index === 0}
                aria-label="Frage nach oben"
                title="Nach oben"
              >
                ↑
              </button>
              <button
                type="button"
                className="sz-question-icon"
                onClick={() => onMove?.(field, 1)}
                disabled={index === order.length - 1}
                aria-label="Frage nach unten"
                title="Nach unten"
              >
                ↓
              </button>
              <input
                className="form-input"
                value={label}
                aria-label="Frage"
                onChange={(ev) => save({ label: ev.target.value })}
              />
              <button
                type="button"
                className="sz-question-icon sz-question-icon--delete"
                onClick={() => onDelete?.(field, label)}
                aria-label="Frage löschen"
                title="Löschen"
              >
                <svg viewBox="0 0 24 24" aria-hidden>
                  <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
              </button>
            </div>
            {options ? (
              <label className="sz-template-options-label">
                Dropdown-Werte
                <OptionsEditor
                  options={options}
                  onCommit={(next) => save({ options: next.length ? next : options })}
                />
              </label>
            ) : null}
            {meta.hasText ? (
              <label className="sz-template-options-label">
                Fragentext
                <input
                  className="form-input"
                  value={text}
                  onChange={(ev) => save({ text: ev.target.value })}
                />
              </label>
            ) : null}
          </div>
        );
      })}
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
  templateEditing = false,
  onQuestionDelete,
  onQuestionUpdate,
  onQuestionMove
}) {
  const patch = (field, value) => onChange?.(field, value);
  const labelFor = (field, fallback) => questionConfig?.labels?.[field]?.[questionLocale] || fallback;
  const order = visibleQuestionOrder(questionConfig);

  if (templateEditing) {
    return (
      <TemplateEditor
        config={questionConfig}
        locale={questionLocale}
        onUpdate={onQuestionUpdate}
        onDelete={onQuestionDelete}
        onMove={onQuestionMove}
      />
    );
  }

  const o2Options = questionDropdownOptions('o2Kunde', questionConfig) || [];
  const angebotOptions = questionDropdownOptions('angebot', questionConfig) || [];

  const fieldNodes = {
    priority: (
      <TicketPriorityField
        key="priority"
        id={`${idPrefix}-priority`}
        value={answers?.priority}
        onChange={(value) => patch('priority', value)}
        questionStyle
        label={labelFor('priority', 'Priorität?')}
        options={questionDropdownOptions('priority', questionConfig)}
      />
    ),
    sprache: (
      <TicketLanguageField
        key="sprache"
        id={`${idPrefix}-sprache`}
        value={answers?.sprache}
        onChange={(value) => patch('sprache', value)}
        questionStyle
        label={labelFor('sprache', 'Sprache?')}
        options={questionDropdownOptions('sprache', questionConfig)}
      />
    ),
    rufnummer: (
      <div className="form-group" key="rufnummer">
        <label className="form-label" htmlFor={`${idPrefix}-rufnummer`}>{labelFor('rufnummer', 'Rufnummer?')}</label>
        <input
          id={`${idPrefix}-rufnummer`}
          className="form-input"
          type="tel"
          value={answers?.rufnummer || ''}
          onChange={(ev) => patch('rufnummer', ev.target.value)}
        />
      </div>
    ),
    o2Kunde: (
      <div className="form-group" key="o2Kunde">
        <label className="form-label" htmlFor={`${idPrefix}-o2`}>{labelFor('o2Kunde', 'O2 Kunde?')}</label>
        <select
          id={`${idPrefix}-o2`}
          className="form-input"
          value={answers?.o2Kunde || ''}
          onChange={(ev) => patch('o2Kunde', ev.target.value)}
        >
          <option value="">—</option>
          {o2Options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    ),
    angebot: (
      <div className="form-group" key="angebot">
        <label className="form-label" htmlFor={`${idPrefix}-angebot`}>{labelFor('angebot', 'Angebot / Produkt?')}</label>
        <select
          id={`${idPrefix}-angebot`}
          className="form-input"
          value={answers?.angebot || ''}
          onChange={(ev) => patch('angebot', ev.target.value)}
        >
          <option value="">—</option>
          {angebotOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    ),
    produktNotiz: (
      <div className="form-group" key="produktNotiz">
        <label className="form-label" htmlFor={`${idPrefix}-produkt`}>{labelFor('produktNotiz', 'Produkt Notiz?')}</label>
        <input
          id={`${idPrefix}-produkt`}
          className="form-input"
          value={answers?.produktNotiz || ''}
          onChange={(ev) => patch('produktNotiz', ev.target.value)}
        />
      </div>
    ),
    stadt: (
      <StadtPicker
        key="stadt"
        id={`${idPrefix}-stadt`}
        label={labelFor('stadt', 'Stadt?')}
        value={answers?.stadt || ''}
        onChange={(value) => patch('stadt', value)}
      />
    ),
    marketingNotiz: (
      <div className="form-group" key="marketingNotiz">
        <label className="form-label" htmlFor={`${idPrefix}-marketing`}>{labelFor('marketingNotiz', 'Marketing Notiz?')}</label>
        <input
          id={`${idPrefix}-marketing`}
          className="form-input"
          value={answers?.marketingNotiz || ''}
          onChange={(ev) => patch('marketingNotiz', ev.target.value)}
        />
      </div>
    ),
    terminDatum: (
      <div className="form-group" key="terminDatum">
        <label className="form-label" htmlFor={`${idPrefix}-datum`}>{labelFor('terminDatum', 'Termin Datum?')}</label>
        <input
          id={`${idPrefix}-datum`}
          className="form-input"
          type="date"
          value={answers?.terminDatum || ''}
          onChange={(ev) => patch('terminDatum', ev.target.value)}
        />
      </div>
    ),
    terminZeit: (
      <div className="form-group" key="terminZeit">
        <label className="form-label" htmlFor={`${idPrefix}-zeit`}>{labelFor('terminZeit', 'Termin Zeit?')}</label>
        <input
          id={`${idPrefix}-zeit`}
          className="form-input"
          type="time"
          value={answers?.terminZeit || ''}
          onChange={(ev) => patch('terminZeit', ev.target.value)}
        />
      </div>
    )
  };

  const fields = (
    <div className={embedded ? 'sz-questions-form' : 'lead-fragen-grid'}>
      {order.map((field) => fieldNodes[field]).filter(Boolean)}
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
