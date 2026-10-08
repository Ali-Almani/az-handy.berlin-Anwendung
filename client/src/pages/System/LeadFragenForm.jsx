import { useEffect, useState } from 'react';
import VorvertragEditLog from './VorvertragEditLog';
import {
  QUESTION_FIELD_TYPES,
  customQuestions,
  normalizeOfferUrl,
  questionDropdownOptions,
  questionOptionLinks,
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

export function AngebotLinksEditor({ options, links, onCommit }) {
  const fromProps = () => {
    const names = Array.isArray(options) && options.length ? options : [''];
    const map = links && typeof links === 'object' ? links : {};
    return names.map((name) => ({
      name: String(name || ''),
      url: map[name] || ''
    }));
  };
  const [items, setItems] = useState(fromProps);

  useEffect(() => {
    setItems(fromProps());
  }, [Array.isArray(options) ? options.join('\n') : '', JSON.stringify(links || {})]);

  const commit = (next) => {
    const cleaned = next
      .map((row) => ({
        name: String(row.name || '').trim(),
        url: normalizeOfferUrl(row.url)
      }))
      .filter((row) => row.name);
    onCommit?.({
      options: cleaned.map((row) => row.name),
      links: Object.fromEntries(cleaned.filter((row) => row.url).map((row) => [row.name, row.url]))
    });
  };

  const changeRow = (index, patch) => {
    const next = items.map((row, i) => (i === index ? { ...row, ...patch } : row));
    setItems(next);
  };

  return (
    <div className="sz-angebot-links">
      {items.map((row, index) => (
        <div key={`angebot-${index}`} className="sz-angebot-link-row">
          <input
            className="form-input"
            value={row.name}
            aria-label="Angebot"
            placeholder="Angebot / Produkt"
            onChange={(ev) => changeRow(index, { name: ev.target.value })}
            onBlur={() => commit(items)}
          />
          <input
            className="form-input"
            value={row.url}
            aria-label="URL"
            placeholder="https://…"
            onChange={(ev) => changeRow(index, { url: ev.target.value })}
            onBlur={() => commit(items)}
          />
          <button
            type="button"
            className="sz-question-icon sz-question-icon--delete"
            onClick={() => {
              const next = items.filter((_, i) => i !== index);
              const fallback = next.length ? next : [{ name: '', url: '' }];
              setItems(fallback);
              commit(fallback);
            }}
            aria-label="Angebot löschen"
            title="Löschen"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn--secondary btn--small"
        onClick={() => setItems((prev) => [...prev, { name: '', url: '' }])}
      >
        Angebot hinzufügen
      </button>
    </div>
  );
}

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

function questionMeta(field, config) {
  if (FIELD_META[field]) return { ...FIELD_META[field], type: '' };
  const added = customQuestions(config).find((item) => item.id === field);
  if (!added) return null;
  const typeLabel = QUESTION_FIELD_TYPES.find((item) => item.id === added.type)?.label || added.type;
  return {
    label: added.label || 'Neue Frage?',
    hasText: true,
    type: typeLabel
  };
}

function TemplateEditor({ config, locale, onUpdate, onDelete, onMove, onAdd }) {
  const order = visibleQuestionOrder(config);
  const [newType, setNewType] = useState('text');
  return (
    <div className="sz-template-edit">
      {order.map((field, index) => {
        const meta = questionMeta(field, config);
        if (!meta) return null;
        const label = config?.labels?.[field]?.[locale] || meta.label;
        const text = config?.texts?.[field]?.[locale] || templateQuestionText(field, locale);
        const options = questionDropdownOptions(field, config);
        const links = questionOptionLinks(field, config);
        const save = (patch) => onUpdate?.(field, {
          label: patch.label ?? label,
          text: meta.hasText ? (patch.text ?? text) : undefined,
          options: patch.options,
          links: patch.links
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
            {field === 'angebot' ? (
              <label className="sz-template-options-label">
                Angebote und URLs
                <AngebotLinksEditor
                  options={options || []}
                  links={links}
                  onCommit={(next) => save({
                    options: next.options.length ? next.options : options,
                    links: next.links
                  })}
                />
              </label>
            ) : options ? (
              <label className="sz-template-options-label">
                Dropdown-Werte
                <OptionsEditor
                  options={options}
                  onCommit={(next) => save({ options: next.length ? next : options })}
                />
              </label>
            ) : null}
            {meta.type ? <p className="sz-template-type">{meta.type}</p> : null}
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
      <div className="sz-template-add">
        <label className="sz-template-options-label">
          Feldtyp
          <select
            className="form-input"
            value={newType}
            onChange={(ev) => setNewType(ev.target.value)}
            aria-label="Feldtyp"
          >
            {QUESTION_FIELD_TYPES.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn--secondary btn--small" onClick={() => onAdd?.(newType)}>
          Frage hinzufügen
        </button>
      </div>
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
  onQuestionMove,
  onQuestionAdd
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
        onAdd={onQuestionAdd}
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

  const renderCustomField = (field) => {
    const added = customQuestions(questionConfig).find((item) => item.id === field);
    if (!added) return null;
    const label = labelFor(field, added.label || 'Neue Frage?');
    const inputId = `${idPrefix}-${field}`;
    if (added.type === 'dropdown') {
      const options = questionDropdownOptions(field, questionConfig) || [];
      return (
        <div className="form-group" key={field}>
          <label className="form-label" htmlFor={inputId}>{label}</label>
          <select
            id={inputId}
            className="form-input"
            value={answers?.[field] || ''}
            onChange={(ev) => patch(field, ev.target.value)}
          >
            <option value="">—</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );
    }
    const inputType = added.type === 'date' || added.type === 'time' || added.type === 'tel' ? added.type : 'text';
    return (
      <div className="form-group" key={field}>
        <label className="form-label" htmlFor={inputId}>{label}</label>
        <input
          id={inputId}
          className="form-input"
          type={inputType}
          value={answers?.[field] || ''}
          onChange={(ev) => patch(field, ev.target.value)}
        />
      </div>
    );
  };

  const fields = (
    <div className={embedded ? 'sz-questions-form' : 'lead-fragen-grid'}>
      {order.map((field) => fieldNodes[field] || renderCustomField(field)).filter(Boolean)}
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
