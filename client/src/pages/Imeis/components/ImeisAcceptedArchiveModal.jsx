import { useCallback, useEffect, useState } from 'react';
import {
  deleteAcceptedImeiArchiveEntryApi,
  getAcceptedImeisArchiveApi
} from '../../../services/imeis.service';

function formatDateTime(iso) {
  if (!iso) return '–';
  try {
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return iso;
  }
}

export default function ImeisAcceptedArchiveModal({ isOpen, onClose, onChanged }) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAcceptedImeisArchiveApi({
        from: fromDate || undefined,
        to: toDate || undefined
      });
      setEntries(Array.isArray(res?.entries) ? res.entries : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Laden fehlgeschlagen.');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    if (!isOpen) return;
    loadEntries();
  }, [isOpen, loadEntries]);

  const handleDelete = async (entry) => {
    if (!entry?.id) return;
    const ok = window.confirm(
      `IMEI ${entry.imei} dauerhaft aus dem Angenommen-Archiv löschen?`
    );
    if (!ok) return;
    setDeletingId(entry.id);
    setError('');
    try {
      await deleteAcceptedImeiArchiveEntryApi(entry.id);
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Löschen fehlgeschlagen.');
    } finally {
      setDeletingId('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="imeis-history-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="imeis-history-modal imeis-accepted-archive-modal"
        role="dialog"
        aria-labelledby="imeis-accepted-archive-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="imeis-history-modal-header">
          <h2 id="imeis-accepted-archive-title">Angenommene IMEIs (Archiv)</h2>
          <button type="button" className="imeis-history-modal-close" onClick={onClose} aria-label="Schließen">
            ×
          </button>
        </div>

        <div className="imeis-history-modal-body">
          <p className="imeis-accepted-archive-hint">
            Alle angenommenen IMEIs aller Mitarbeiter. Bei Excel-Upload werden Treffer in der Kategorie
            „Angenommen (Excel)“ angezeigt.
          </p>

          <div className="imeis-accepted-archive-filters">
          <div className="form-group">
            <label htmlFor="accepted-from" className="form-label">Von</label>
            <input
              id="accepted-from"
              type="date"
              className="form-input"
              value={fromDate}
              onChange={(ev) => setFromDate(ev.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="accepted-to" className="form-label">Bis</label>
            <input
              id="accepted-to"
              type="date"
              className="form-input"
              value={toDate}
              onChange={(ev) => setToDate(ev.target.value)}
            />
          </div>
          <button type="button" className="btn btn--secondary btn--small" onClick={loadEntries} disabled={loading}>
            {loading ? 'Laden…' : 'Filtern'}
          </button>
        </div>

        {error ? <p className="imeis-accepted-archive-error" role="alert">{error}</p> : null}

        <div className="imeis-accepted-archive-table-wrap">
          {loading ? (
            <p className="imeis-accepted-archive-hint">Laden…</p>
          ) : entries.length === 0 ? (
            <p className="imeis-accepted-archive-hint">Keine angenommenen IMEIs im gewählten Zeitraum.</p>
          ) : (
            <table className="imeis-history-table">
              <thead>
                <tr>
                  <th>IMEI</th>
                  <th>Produkt</th>
                  <th>Mitarbeiter</th>
                  <th>Angenommen am</th>
                  <th>Angenommen von</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.imei}</td>
                    <td>{entry.product || '–'}</td>
                    <td>{entry.userName || '–'}</td>
                    <td>{formatDateTime(entry.acceptedAt)}</td>
                    <td>{entry.acceptedByName || '–'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--danger btn--small"
                        disabled={deletingId === entry.id}
                        onClick={() => handleDelete(entry)}
                      >
                        {deletingId === entry.id ? '…' : 'Löschen'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
