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

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
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
          <h3 id="imeis-accepted-archive-title">Angenommenes Archiv</h3>
          <button type="button" className="imeis-history-modal-close" onClick={onClose} aria-label="Schließen">
            ×
          </button>
        </div>

        <div className="imeis-history-modal-body">
          <div className="imeis-accepted-archive-toolbar">
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
              <div className="imeis-accepted-archive-filters__actions">
                <button type="button" className="btn btn--secondary btn--small" onClick={loadEntries} disabled={loading}>
                  {loading ? 'Laden…' : 'Anwenden'}
                </button>
                {(fromDate || toDate) && (
                  <button type="button" className="btn btn--outline btn--small" onClick={handleClearFilters}>
                    Zurücksetzen
                  </button>
                )}
              </div>
            </div>
            <div className="imeis-accepted-archive-count">
              {loading ? '…' : `${entries.length} Eintrag${entries.length === 1 ? '' : 'e'}`}
            </div>
          </div>

          {error ? <p className="imeis-accepted-archive-error" role="alert">{error}</p> : null}

          <div className="imeis-accepted-archive-table-wrap">
            {loading ? (
              <div className="imeis-accepted-archive-empty">Laden…</div>
            ) : entries.length === 0 ? (
              <div className="imeis-accepted-archive-empty">
                Keine angenommenen IMEIs im gewählten Zeitraum.
              </div>
            ) : (
              <table className="imeis-accepted-archive-table">
                <thead>
                  <tr>
                    <th>IMEI</th>
                    <th>Produkt</th>
                    <th>Mitarbeiter</th>
                    <th>Angenommen am</th>
                    <th>Angenommen von</th>
                    <th aria-label="Aktionen" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="imeis-accepted-archive-table__imei">{entry.imei}</td>
                      <td className="imeis-accepted-archive-table__product">{entry.product || '–'}</td>
                      <td>{entry.userName || '–'}</td>
                      <td className="imeis-accepted-archive-table__date">{formatDateTime(entry.acceptedAt)}</td>
                      <td>{entry.acceptedByName || '–'}</td>
                      <td className="imeis-accepted-archive-table__actions">
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
