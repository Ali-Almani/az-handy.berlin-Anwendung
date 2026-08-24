import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  filterOriginalAnbieterOptions,
  isKnownOriginalAnbieter
} from './mnpConstants';

export default function OriginalAnbieterPicker({
  id,
  label = 'Original Anbieter',
  value = '',
  onChange,
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
        setQuery(value || '');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, value]);

  const filtered = useMemo(() => filterOriginalAnbieterOptions(query), [query]);
  const trimmedQuery = query.trim();
  const showCustomOption =
    trimmedQuery.length > 0 && !isKnownOriginalAnbieter(trimmedQuery);

  const selectMarke = (marke) => {
    onChange?.(marke);
    setQuery(marke);
    setOpen(false);
  };

  const applyCustom = () => {
    if (!trimmedQuery) return;
    onChange?.(trimmedQuery);
    setQuery(trimmedQuery);
    setOpen(false);
  };

  return (
    <div className="form-group original-anbieter-picker" ref={rootRef}>
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
        placeholder="Suchen oder Anbieter eingeben…"
        onFocus={() => setOpen(true)}
        onChange={(ev) => {
          setQuery(ev.target.value);
          setOpen(true);
        }}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            if (showCustomOption) {
              applyCustom();
            } else if (filtered.length === 1) {
              selectMarke(filtered[0].marke);
            }
          } else if (ev.key === 'Escape') {
            setOpen(false);
            setQuery(value || '');
          }
        }}
      />
      {open ? (
        <div id={listId} className="original-anbieter-picker__dropdown" role="listbox">
          <div className="original-anbieter-picker__header" aria-hidden="true">
            <span>Marke</span>
            <span>Netz</span>
          </div>
          {filtered.length === 0 ? (
            <p className="original-anbieter-picker__empty">Kein Treffer in der Liste.</p>
          ) : (
            filtered.map(({ marke, netz }) => (
              <button
                key={marke}
                type="button"
                role="option"
                aria-selected={value === marke}
                className={`original-anbieter-picker__option${value === marke ? ' original-anbieter-picker__option--active' : ''}`}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => selectMarke(marke)}
              >
                <span className="original-anbieter-picker__marke">{marke}</span>
                <span className="original-anbieter-picker__netz">{netz}</span>
              </button>
            ))
          )}
          {showCustomOption ? (
            <button
              type="button"
              className="original-anbieter-picker__custom"
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={applyCustom}
            >
              Neuer Anbieter: <strong>{trimmedQuery}</strong>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
