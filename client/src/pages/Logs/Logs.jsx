import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isAdmin } from '../../utils/roles';
import { listAuditLogsApi } from '../../services/auditLog.service';
import './Logs.scss';

const PAGE_SIZE = 50;

const CATEGORY_LABELS = {
  auth: 'Auth',
  user: 'Benutzer',
  imei: 'IMEI',
  vorvertrag: 'Vorvertrag',
  excel: 'Excel',
  voucher: 'Voucher',
  dashboard: 'Dashboard'
};

function formatDateTime(iso) {
  if (!iso) return '–';
  try {
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return iso;
  }
}

export default function Logs() {
  const { user } = useAuth();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listAuditLogsApi({
        from: fromDate || undefined,
        to: toDate || undefined,
        category: category || undefined,
        search: search.trim() || undefined,
        limit: PAGE_SIZE,
        offset
      });
      setEntries(Array.isArray(res?.entries) ? res.entries : []);
      setTotal(Number(res?.total) || 0);
      if (Array.isArray(res?.categories)) setCategories(res.categories);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Laden fehlgeschlagen.');
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, category, search, offset]);

  const categoryOptions = useMemo(() => {
    const list = categories.length > 0 ? categories : Object.keys(CATEGORY_LABELS);
    return list.map((c) => ({ value: c, label: CATEGORY_LABELS[c] || c }));
  }, [categories]);

  useEffect(() => {
    if (!user || !isAdmin(user)) return undefined;
    const delay = search.trim() ? 350 : 0;
    const t = setTimeout(() => {
      loadLogs();
    }, delay);
    return () => clearTimeout(t);
  }, [user, fromDate, toDate, category, search, offset, loadLogs]);

  if (!user || !isAdmin(user)) {
    return <Navigate to="/" replace />;
  }

  const applyFilters = () => {
    setOffset(0);
  };

  const resetFilters = () => {
    setFromDate('');
    setToDate('');
    setCategory('');
    setSearch('');
    setOffset(0);
  };

  return (
    <div className="logs-page container">
      <h1 className="logs-page__title">Audit-Log</h1>
      <p className="logs-page__hint">
        Protokoll wichtiger Aktionen der letzten 30 Tage (nur für Administratoren).
      </p>

      <div className="logs-filters">
        <div className="form-group">
          <label htmlFor="logs-from" className="form-label">Von</label>
          <input
            id="logs-from"
            type="date"
            className="form-input"
            value={fromDate}
            onChange={(ev) => setFromDate(ev.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="logs-to" className="form-label">Bis</label>
          <input
            id="logs-to"
            type="date"
            className="form-input"
            value={toDate}
            onChange={(ev) => setToDate(ev.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="logs-category" className="form-label">Kategorie</label>
          <select
            id="logs-category"
            className="form-input"
            value={category}
            onChange={(ev) => setCategory(ev.target.value)}
          >
            <option value="">Alle</option>
            {categoryOptions.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="form-group logs-filters__search">
          <label htmlFor="logs-search" className="form-label">Suche</label>
          <input
            id="logs-search"
            type="search"
            className="form-input"
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
            placeholder="Benutzer, Aktion, Text…"
          />
        </div>
        <div className="logs-filters__actions">
          <button type="button" className="btn btn--primary btn--small" onClick={applyFilters}>
            Filtern
          </button>
          <button type="button" className="btn btn--secondary btn--small" onClick={resetFilters}>
            Zurücksetzen
          </button>
        </div>
      </div>

      {error ? <p className="logs-page__error" role="alert">{error}</p> : null}

      <div className="logs-table-wrap">
        {loading ? (
          <p className="logs-page__empty">Laden…</p>
        ) : entries.length === 0 ? (
          <p className="logs-page__empty">Keine Log-Einträge für diese Filter.</p>
        ) : (
          <table className="logs-table">
            <thead>
              <tr>
                <th>Zeit</th>
                <th>Benutzer</th>
                <th>Kategorie</th>
                <th>Aktion</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="logs-table__time">{formatDateTime(entry.timestamp)}</td>
                  <td>
                    <span className="logs-table__user">{entry.userName || '–'}</span>
                    {entry.userRole ? (
                      <span className="logs-table__role">{entry.userRole}</span>
                    ) : null}
                  </td>
                  <td>
                    <span className="logs-table__category">
                      {CATEGORY_LABELS[entry.category] || entry.category}
                    </span>
                  </td>
                  <td className="logs-table__action">{entry.action}</td>
                  <td className="logs-table__summary">{entry.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && total > 0 ? (
        <div className="logs-pagination">
          <span className="logs-pagination__info">
            {total} Eintrag{total === 1 ? '' : 'e'} · Seite {page} von {totalPages}
          </span>
          <div className="logs-pagination__buttons">
            <button
              type="button"
              className="btn btn--secondary btn--small"
              disabled={offset <= 0}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            >
              Zurück
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--small"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
            >
              Weiter
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
