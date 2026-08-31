import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { buildGeraeteOptionsFromImeis } from './vorvertragGeraeteUtils';

const PREFIX_ALIASES = [
  ['iph', 'iphone'],
  ['sam', 'samsung'],
  ['gal', 'galaxy'],
  ['xia', 'xiaomi'],
  ['pix', 'pixel']
];

function expandQuery(raw) {
  const q = String(raw ?? '').trim().toLowerCase();
  if (!q) return '';
  for (const [prefix, alias] of PREFIX_ALIASES) {
    if (q === prefix || (alias.startsWith(q) && q.length >= 2)) return alias;
  }
  return q;
}

function filterSuggestions(options, rawQuery) {
  const q = String(rawQuery ?? '').trim().toLowerCase();
  if (!q) return options.slice(0, 12);
  const expanded = expandQuery(q);
  const scored = [];
  for (const option of options) {
    const lower = option.toLowerCase();
    if (lower.includes(q) || (expanded !== q && lower.includes(expanded))) {
      const starts = lower.startsWith(q) || lower.startsWith(expanded) ? 0 : 1;
      scored.push({ option, starts });
    }
  }
  scored.sort((a, b) => a.starts - b.starts || a.option.localeCompare(b.option, 'de', { sensitivity: 'base' }));
  return scored.slice(0, 12).map((item) => item.option);
}

export default function VorvertragGeraetSuggestField({
  id = 'vv-geraet',
  label = 'Gerät',
  value = '',
  onChange,
  imeis = [],
  loading = false,
  required = false
}) {
  const listId = useId();
  const rootRef = useRef(null);
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (ev) => {
      if (rootRef.current && !rootRef.current.contains(ev.target)) {
        setOpen(false);
        if (query.trim() !== String(value || '').trim()) {
          onChange?.(query.trim());
        }
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, query, value, onChange]);

  const options = useMemo(() => buildGeraeteOptionsFromImeis(imeis), [imeis]);
  const filtered = useMemo(() => filterSuggestions(options, query), [options, query]);
  const trimmedQuery = query.trim();
  const showCustom =
    trimmedQuery.length > 0 &&
    !filtered.some((item) => item.toLowerCase() === trimmedQuery.toLowerCase());

  const selectOption = (next) => {
    onChange?.(next);
    setQuery(next);
    setOpen(false);
  };

  const applyTyped = () => {
    if (!trimmedQuery) return;
    selectOption(trimmedQuery);
  };

  return (
    <div className="form-group original-anbieter-picker vorvertrag-geraet-suggest" ref={rootRef}>
      <label htmlFor={id} className={`form-label${required ? ' form-label--required' : ''}`}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        className="form-input"
        value={query}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={loading ? 'Geräte werden geladen…' : 'z. B. iph → iPhone …'}
        onFocus={() => setOpen(true)}
        onChange={(ev) => {
          setQuery(ev.target.value);
          setOpen(true);
          onChange?.(ev.target.value);
        }}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            if (filtered.length > 0) {
              selectOption(filtered[0]);
            } else {
              applyTyped();
            }
          } else if (ev.key === 'Escape') {
            setOpen(false);
            setQuery(value || '');
          }
        }}
      />
      {open ? (
        <div id={listId} className="original-anbieter-picker__dropdown" role="listbox">
          {loading && options.length === 0 ? (
            <p className="original-anbieter-picker__empty">Geräte werden geladen…</p>
          ) : filtered.length === 0 ? (
            <p className="original-anbieter-picker__empty">Kein Treffer – Text einfach übernehmen.</p>
          ) : (
            filtered.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={value === option}
                className={`original-anbieter-picker__option vorvertrag-geraet-suggest__option${value === option ? ' original-anbieter-picker__option--active' : ''}`}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => selectOption(option)}
              >
                <span className="original-anbieter-picker__marke">{option}</span>
              </button>
            ))
          )}
          {showCustom ? (
            <button
              type="button"
              className="original-anbieter-picker__custom"
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={applyTyped}
            >
              Übernehmen: <strong>{trimmedQuery}</strong>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
