function formatLogTime(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '—';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

export default function VorvertragEditLog({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <section className="vorvertrag-edit-log" aria-label="Bearbeitungslog">
      <h3 className="vorvertrag-section-title">Bearbeitungslog</h3>
      <ol className="vorvertrag-edit-log__list">
        {items.map((item) => (
          <li key={item.id} className="vorvertrag-edit-log__item">
            <div className="vorvertrag-edit-log__meta">
              <span className="vorvertrag-edit-log__time">{formatLogTime(item.timestamp)}</span>
              <span className="vorvertrag-edit-log__who">{item.editorName || 'Unbekannt'}</span>
              <span className="vorvertrag-edit-log__action">{item.actionLabel || 'Bearbeitet'}</span>
            </div>
            {Array.isArray(item.changes) && item.changes.length > 0 ? (
              <ul className="vorvertrag-edit-log__changes">
                {item.changes.slice(0, 12).map((change, index) => (
                  <li key={`${item.id}-${change.field}-${index}`}>
                    <strong>{change.field}:</strong> {change.from} → {change.to}
                  </li>
                ))}
                {item.changes.length > 12 ? (
                  <li>… {item.changes.length - 12} weitere Änderungen</li>
                ) : null}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
