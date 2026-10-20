import { useEffect, useRef, useState } from 'react';
import VorvertragEditLog from './VorvertragEditLog';
import {
  QUESTION_FIELD_TYPES,
  customQuestions,
  normalizeOfferEntry,
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
  angebot: { label: 'Produkt?', hasText: true },
  produktNotiz: { label: 'Produkt Notiz?', hasText: true },
  stadt: { label: 'Stadt?', hasText: true },
  marketingNotiz: { label: 'Marketing Notiz?', hasText: true },
  terminDatum: { label: 'Termin Datum?', hasText: true },
  terminZeit: { label: 'Termin Zeit?', hasText: true }
};

function readOfferImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !String(file.type || '').startsWith('image/')) {
      reject(new Error('Nur Bilder sind erlaubt.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
      img.onload = () => {
        const max = 480;
        let width = img.width;
        let height = img.height;
        if (width > max || height > max) {
          const scale = max / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.68));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

function blankOfferRow() {
  return { name: '', de: { url: '', image: '' }, ar: { url: '', image: '' } };
}

export function AngebotLinksEditor({ options, links, onCommit }) {
  const fileRef = useRef(null);
  const pickTarget = useRef(null);
  const fromProps = () => {
    const names = Array.isArray(options) && options.length ? options : [''];
    const map = links && typeof links === 'object' ? links : {};
    return names.map((name) => {
      const entry = normalizeOfferEntry(map[name]);
      return { name: String(name || ''), de: entry.de, ar: entry.ar };
    });
  };
  const [items, setItems] = useState(fromProps);

  useEffect(() => {
    setItems(fromProps());
  }, [Array.isArray(options) ? options.join('\n') : '', JSON.stringify(links || {})]);

  const commit = (next) => {
    const cleaned = next
      .map((row) => ({
        name: String(row.name || '').trim(),
        de: {
          url: normalizeOfferUrl(row.de?.url),
          image: String(row.de?.image || '').trim()
        },
        ar: {
          url: normalizeOfferUrl(row.ar?.url),
          image: String(row.ar?.image || '').trim()
        }
      }))
      .filter((row) => row.name);
    onCommit?.({
      options: cleaned.map((row) => row.name),
      links: Object.fromEntries(cleaned.map((row) => [row.name, { de: row.de, ar: row.ar }]))
    });
  };

  const changeRow = (index, patch) => {
    const next = items.map((row, i) => (i === index ? { ...row, ...patch } : row));
    setItems(next);
    return next;
  };

  const changeLocale = (index, locale, patch) => {
    const row = items[index];
    if (!row) return items;
    return changeRow(index, {
      [locale]: { ...row[locale], ...patch }
    });
  };

  const onImage = async (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    const target = pickTarget.current;
    pickTarget.current = null;
    if (!file || !target) return;
    try {
      const src = await readOfferImage(file);
      const next = changeLocale(target.index, target.locale, { image: src });
      commit(next);
    } catch (err) {
      window.alert(err?.message || 'Bild konnte nicht gelesen werden.');
    }
  };

  return (
    <div className="sz-angebot-links">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onImage}
      />
      {items.map((row, index) => (
        <div key={`angebot-${index}`} className="sz-angebot-link-row">
          <div className="sz-angebot-link-head">
            <input
              className="form-input"
              value={row.name}
              aria-label="Produkt"
              placeholder="Produkt"
              onChange={(ev) => changeRow(index, { name: ev.target.value })}
              onBlur={(ev) => commit(changeRow(index, { name: ev.target.value }))}
            />
            <button
              type="button"
              className="sz-question-icon sz-question-icon--delete"
              onClick={() => {
                const next = items.filter((_, i) => i !== index);
                const fallback = next.length ? next : [blankOfferRow()];
                setItems(fallback);
                commit(fallback);
              }}
              aria-label="Produkt löschen"
              title="Löschen"
            >
              ×
            </button>
          </div>
          {['de', 'ar'].map((locale) => (
            <div key={locale} className="sz-angebot-locale">
              <span className="sz-angebot-locale-tag">{locale === 'de' ? 'DE' : 'AR'}</span>
              <input
                className="form-input"
                value={row[locale]?.url || ''}
                aria-label={`URL ${locale === 'de' ? 'Deutsch' : 'Arabisch'}`}
                placeholder="https://…"
                onChange={(ev) => changeLocale(index, locale, { url: ev.target.value })}
                onBlur={(ev) => commit(changeLocale(index, locale, { url: ev.target.value }))}
              />
              <div className="sz-angebot-image-slot">
                {row[locale]?.image ? (
                  <button
                    type="button"
                    className="sz-angebot-image-btn"
                    onClick={() => {
                      pickTarget.current = { index, locale };
                      fileRef.current?.click();
                    }}
                    aria-label={`Bild ${locale === 'de' ? 'Deutsch' : 'Arabisch'} ändern`}
                    title="Bild ändern"
                  >
                    <img src={row[locale].image} alt="" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="sz-question-icon"
                    onClick={() => {
                      pickTarget.current = { index, locale };
                      fileRef.current?.click();
                    }}
                    aria-label={`Bild ${locale === 'de' ? 'Deutsch' : 'Arabisch'} hinzufügen`}
                    title="Bild hinzufügen"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden>
                      <path fill="currentColor" d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                    </svg>
                  </button>
                )}
                {row[locale]?.image ? (
                  <button
                    type="button"
                    className="sz-angebot-image-clear"
                    onClick={() => {
                      const next = changeLocale(index, locale, { image: '' });
                      commit(next);
                    }}
                    aria-label="Bild entfernen"
                    title="Bild entfernen"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ))}
      <button
        type="button"
        className="btn btn--secondary btn--small"
        onClick={() => setItems((prev) => [...prev, blankOfferRow()])}
      >
        Produkt hinzufügen
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
      <div className="sz-template-edit-list">
      {order.map((field, index) => {
        const meta = questionMeta(field, config);
        if (!meta) return null;
        const label = config?.labels?.[field]?.[locale] || meta.label;
        const text = config?.texts?.[field]?.[locale] || templateQuestionText(field, locale);
        const options = questionDropdownOptions(field, config);
        const links = field === 'angebot'
          ? (config?.links?.angebot || {})
          : questionOptionLinks(field, config);
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
      </div>
      <div className="sz-template-add sz-template-add--dock">
        <label className="sz-template-options-label">
          Neue Frage – Feldtyp
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
        <button type="button" className="btn btn--primary btn--small" onClick={() => onAdd?.(newType)}>
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
  const labelFor = (field, fallback) => {
    let custom = String(questionConfig?.labels?.[field]?.[questionLocale] || '').trim();
    if (field === 'angebot' && (custom === 'Angebot / Produkt?' || custom === 'Angebot / Produkt')) custom = '';
    const text = custom || fallback;
    return text.endsWith('?') ? text : `${text}?`;
  };
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
        <input
          id={`${idPrefix}-rufnummer`}
          className="form-input"
          type="tel"
          value={answers?.rufnummer || ''}
          placeholder={labelFor('rufnummer', 'Rufnummer?')}
          aria-label={labelFor('rufnummer', 'Rufnummer?')}
          onChange={(ev) => patch('rufnummer', ev.target.value)}
        />
      </div>
    ),
    o2Kunde: (
      <div className="form-group" key="o2Kunde">
        <select
          id={`${idPrefix}-o2`}
          className="form-input"
          value={answers?.o2Kunde || ''}
          aria-label={labelFor('o2Kunde', 'O2 Kunde?')}
          onChange={(ev) => patch('o2Kunde', ev.target.value)}
        >
          <option value="">{labelFor('o2Kunde', 'O2 Kunde?')}</option>
          {o2Options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    ),
    angebot: (
      <div className="form-group" key="angebot">
        <select
          id={`${idPrefix}-angebot`}
          className="form-input"
          value={answers?.angebot || ''}
          aria-label={labelFor('angebot', 'Produkt?')}
          onChange={(ev) => patch('angebot', ev.target.value)}
        >
          <option value="">{labelFor('angebot', 'Produkt?')}</option>
          {angebotOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    ),
    produktNotiz: (
      <div className="form-group" key="produktNotiz">
        <input
          id={`${idPrefix}-produkt`}
          className="form-input"
          value={answers?.produktNotiz || ''}
          placeholder={labelFor('produktNotiz', 'Produkt Notiz?')}
          aria-label={labelFor('produktNotiz', 'Produkt Notiz?')}
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
        <input
          id={`${idPrefix}-marketing`}
          className="form-input"
          value={answers?.marketingNotiz || ''}
          placeholder={labelFor('marketingNotiz', 'Marketing Notiz?')}
          aria-label={labelFor('marketingNotiz', 'Marketing Notiz?')}
          onChange={(ev) => patch('marketingNotiz', ev.target.value)}
        />
      </div>
    ),
    terminDatum: (
      <div className="form-group" key="terminDatum">
        <input
          id={`${idPrefix}-datum`}
          className="form-input"
          type={answers?.terminDatum ? 'date' : 'text'}
          value={answers?.terminDatum || ''}
          placeholder={labelFor('terminDatum', 'Termin Datum?')}
          aria-label={labelFor('terminDatum', 'Termin Datum?')}
          onFocus={(ev) => { ev.target.type = 'date'; }}
          onBlur={(ev) => { if (!ev.target.value) ev.target.type = 'text'; }}
          onChange={(ev) => patch('terminDatum', ev.target.value)}
        />
      </div>
    ),
    terminZeit: (
      <div className="form-group" key="terminZeit">
        <input
          id={`${idPrefix}-zeit`}
          className="form-input"
          type={answers?.terminZeit ? 'time' : 'text'}
          value={answers?.terminZeit || ''}
          placeholder={labelFor('terminZeit', 'Termin Zeit?')}
          aria-label={labelFor('terminZeit', 'Termin Zeit?')}
          onFocus={(ev) => { ev.target.type = 'time'; }}
          onBlur={(ev) => { if (!ev.target.value) ev.target.type = 'text'; }}
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
          <select
            id={inputId}
            className="form-input"
            value={answers?.[field] || ''}
            aria-label={label}
            onChange={(ev) => patch(field, ev.target.value)}
          >
            <option value="">{label}</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );
    }
    const inputType = added.type === 'date' || added.type === 'time' || added.type === 'tel' ? added.type : 'text';
    const hasValue = Boolean(answers?.[field]);
    const shownType = (added.type === 'date' || added.type === 'time') && !hasValue ? 'text' : inputType;
    return (
      <div className="form-group" key={field}>
        <input
          id={inputId}
          className="form-input"
          type={shownType}
          value={answers?.[field] || ''}
          placeholder={label}
          aria-label={label}
          onFocus={(ev) => {
            if (added.type === 'date' || added.type === 'time') ev.target.type = added.type;
          }}
          onBlur={(ev) => {
            if ((added.type === 'date' || added.type === 'time') && !ev.target.value) ev.target.type = 'text';
          }}
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
