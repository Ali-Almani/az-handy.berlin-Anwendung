function formatLogTime(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '—';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function editorName(item) {
  return String(
    item?.editorName
    || item?.editorUserName
    || item?.editorEmail
    || ''
  ).trim() || 'Unbekannt';
}

function changeText(change) {
  const field = String(change?.field || 'Feld').trim() || 'Feld';
  const from = String(change?.from ?? '—').trim() || '—';
  const to = String(change?.to ?? '—').trim() || '—';
  return `${field}: ${from} → ${to}`;
}

function logRows(items) {
  const rows = [];
  for (const item of Array.isArray(items) ? items : []) {
    const when = formatLogTime(item?.timestamp);
    const who = editorName(item);
    const changes = Array.isArray(item?.changes) ? item.changes : [];
    if (changes.length) {
      changes.forEach((change, index) => {
        rows.push({
          id: `${item.id || 'log'}-${change.field || 'feld'}-${index}`,
          when,
          who,
          what: changeText(change)
        });
      });
      continue;
    }
    rows.push({
      id: item?.id || `log-${rows.length}`,
      when,
      who,
      what: item?.actionLabel || 'Bearbeitet'
    });
  }
  return rows;
}

export default function VorvertragEditLog({ items = [] }) {
  const rows = logRows(items);
  if (!rows.length) return null;

  return (
    <section className="vorvertrag-edit-log" aria-label="Bearbeitungslog">
      <h3 className="vorvertrag-section-title">Bearbeitungslog</h3>
      <ol className="vorvertrag-edit-log__list">
        {rows.map((row) => (
          <li key={row.id} className="vorvertrag-edit-log__item">
            <div className="vorvertrag-edit-log__meta">
              <span className="vorvertrag-edit-log__time">{row.when}</span>
              <span className="vorvertrag-edit-log__who">{row.who}</span>
              <span className="vorvertrag-edit-log__what">{row.what}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
