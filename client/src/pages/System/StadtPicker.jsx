import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { filterStadtOptions, isKnownStadt } from './deutscheStaedte';

export default function StadtPicker({
  id,
  label = 'Stadt?',
  value = '',
  onChange
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
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const filtered = useMemo(() => filterStadtOptions(query), [query]);
  const trimmedQuery = query.trim();
  const showCustomOption = trimmedQuery.length > 0 && !isKnownStadt(trimmedQuery);

  const selectStadt = (stadt) => {
    onChange?.(stadt);
    setQuery(stadt);
    setOpen(false);
  };

  return (
    <div className="form-group original-anbieter-picker" ref={rootRef}>
      <label htmlFor={id} className="form-label">{label}</label>
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
        placeholder="Stadt suchen oder selbst schreiben…"
        onFocus={() => setOpen(true)}
        onChange={(ev) => {
          const next = ev.target.value;
          setQuery(next);
          onChange?.(next);
          setOpen(true);
        }}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            if (filtered.length === 1) {
              selectStadt(filtered[0]);
            } else {
              setOpen(false);
            }
          }
          if (ev.key === 'Escape') setOpen(false);
        }}
      />
      {open ? (
        <div id={listId} className="original-anbieter-picker__dropdown" role="listbox">
          {filtered.length === 0 && !showCustomOption ? (
            <p className="original-anbieter-picker__empty">Kein Treffer – Text einfach übernehmen.</p>
          ) : (
            filtered.map((stadt) => (
              <button
                key={stadt}
                type="button"
                role="option"
                aria-selected={value === stadt}
                className={`original-anbieter-picker__option${value === stadt ? ' original-anbieter-picker__option--active' : ''}`}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => selectStadt(stadt)}
              >
                <span className="original-anbieter-picker__marke">{stadt}</span>
              </button>
            ))
          )}
          {showCustomOption ? (
            <button
              type="button"
              className="original-anbieter-picker__custom"
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => selectStadt(trimmedQuery)}
            >
              „{trimmedQuery}“ übernehmen
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
