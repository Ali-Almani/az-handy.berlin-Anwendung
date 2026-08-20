import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteAcceptedImeiArchiveEntryApi,
  deleteAcceptedImeiArchiveEntriesBulkApi,
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

function escapeCsvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function downloadAcceptedArchiveCsv(rows, { fromDate, toDate } = {}) {
  if (!rows.length) return;
  const headers = ['IMEI', 'Produkt', 'Mitarbeiter', 'Angenommen am', 'Angenommen von'];
  const csvRows = rows.map((entry) => [
    entry.imei ?? '',
    entry.product ?? '',
    entry.userName ?? '',
    formatDateTime(entry.acceptedAt),
    entry.acceptedByName ?? ''
  ]);
  const csvContent = `\uFEFF${[headers, ...csvRows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\n')}`;
  const rangePart = [fromDate, toDate].filter(Boolean).join('_') || 'alle';
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
  link.download = `angenommen-archiv_${rangePart}_${new Date().toISOString().split('T')[0]}.csv`;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export default function ImeisAcceptedArchiveModal({ isOpen, onClose, onChanged }) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAcceptedImeisArchiveApi({
        from: fromDate || undefined,
        to: toDate || undefined
      });
      const list = Array.isArray(res?.entries) ? res.entries : [];
      setEntries(list);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Laden fehlgeschlagen.');
      setEntries([]);
      setSelectedIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    if (!isOpen) return;
    loadEntries();
  }, [isOpen, loadEntries]);

  useEffect(() => {
    if (!isOpen) setSelectedIds(new Set());
  }, [isOpen]);

  const entryIds = useMemo(() => entries.map((e) => e.id).filter(Boolean), [entries]);
  const allSelected = entryIds.length > 0 && entryIds.every((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entryIds));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Löschen fehlgeschlagen.');
    } finally {
      setDeletingId('');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCount === 0 || bulkDeleting) return;
    const ok = window.confirm(
      `${selectedCount} Eintrag${selectedCount === 1 ? '' : 'e'} dauerhaft aus dem Angenommen-Archiv löschen?`
    );
    if (!ok) return;
    setBulkDeleting(true);
    setError('');
    try {
      const ids = [...selectedIds];
      const useRangeDelete =
        allSelected &&
        ids.length > 0 &&
        (fromDate || toDate);
      const res = useRangeDelete
        ? await deleteAcceptedImeiArchiveEntriesBulkApi({
            allInRange: true,
            from: fromDate || undefined,
            to: toDate || undefined
          })
        : await deleteAcceptedImeiArchiveEntriesBulkApi({ ids });
      await loadEntries();
      onChanged?.();
      if (res?.message) {
        // optional feedback – errors only via setError
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Löschen fehlgeschlagen.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
  };

  const handleExportCsv = () => {
    const rows =
      selectedCount > 0
        ? entries.filter((e) => selectedIds.has(e.id))
        : entries;
    if (rows.length === 0) return;
    downloadAcceptedArchiveCsv(rows, { fromDate, toDate });
  };

  const exportLabel =
    selectedCount > 0
      ? `Exportieren (CSV, ${selectedCount})`
      : 'Exportieren (CSV)';

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
            <div className="imeis-accepted-archive-toolbar__meta">
              <span className="imeis-accepted-archive-count">
                {loading ? '…' : `${entries.length} Eintrag${entries.length === 1 ? '' : 'e'}`}
              </span>
              <button
                type="button"
                className="btn btn--secondary btn--small"
                disabled={loading || bulkDeleting || entries.length === 0}
                onClick={handleExportCsv}
              >
                {exportLabel}
              </button>
              {selectedCount > 0 ? (
                <button
                  type="button"
                  className="btn btn--danger btn--small"
                  disabled={bulkDeleting || loading}
                  onClick={handleBulkDelete}
                >
                  {bulkDeleting
                    ? 'Löschen…'
                    : `Ausgewählte löschen (${selectedCount})`}
                </button>
              ) : null}
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
                    <th className="imeis-accepted-archive-table__check">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        aria-label="Alle auswählen"
                        disabled={bulkDeleting}
                      />
                    </th>
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
                    <tr key={entry.id} className={selectedIds.has(entry.id) ? 'imeis-accepted-archive-table__row--selected' : ''}>
                      <td className="imeis-accepted-archive-table__check">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(entry.id)}
                          onChange={() => toggleSelectOne(entry.id)}
                          aria-label={`IMEI ${entry.imei} auswählen`}
                          disabled={bulkDeleting}
                        />
                      </td>
                      <td className="imeis-accepted-archive-table__imei">{entry.imei}</td>
                      <td className="imeis-accepted-archive-table__product">{entry.product || '–'}</td>
                      <td>{entry.userName || '–'}</td>
                      <td className="imeis-accepted-archive-table__date">{formatDateTime(entry.acceptedAt)}</td>
                      <td>{entry.acceptedByName || '–'}</td>
                      <td className="imeis-accepted-archive-table__actions">
                        <button
                          type="button"
                          className="btn btn--danger btn--small"
                          disabled={deletingId === entry.id || bulkDeleting}
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
