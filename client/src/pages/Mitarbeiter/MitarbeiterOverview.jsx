import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getUserDirectory } from '../../services/user.service';
import { sortUsersByEinsatzOrt } from '../../utils/roles';
import './Mitarbeiter.scss';

const telHref = (raw) => {
  const s = String(raw || '').trim();
  if (!s) return null;
  const digits = s.replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : `tel:${s}`;
};

const renderRows = (rows) =>
  rows.map((u) => {
    const tel = u.telefon?.trim() ? u.telefon.trim() : '';
    return (
      <tr key={u.id}>
        <td>
          <Link to={`/mitarbeiter/${u.id}`} className="mitarbeiter-cell-user">
            {u.avatar ? (
              <img src={u.avatar} alt="" className="mitarbeiter-avatar-tn" />
            ) : (
              <span className="mitarbeiter-avatar-tn-placeholder">
                {(u.name || '?').charAt(0).toUpperCase()}
              </span>
            )}
            <span>{u.name}</span>
          </Link>
        </td>
        <td>{u.einsatz_ort?.trim() ? u.einsatz_ort : '–'}</td>
        <td>
          {tel ? (
            <a href={telHref(tel)} className="mitarbeiter-tel-link">
              {tel}
            </a>
          ) : (
            '–'
          )}
        </td>
      </tr>
    );
  });

const MitarbeiterOverview = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getUserDirectory();
        if (!cancelled) {
          setUsers(res.data.users || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || 'Daten konnten nicht geladen werden');
          setUsers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const sorted = useMemo(() => sortUsersByEinsatzOrt(users), [users]);

  return (
    <div className="mitarbeiter-page">
      <header className="mitarbeiter-page__header">
        <h1>Mitarbeiter Übersicht</h1>
      </header>
      {error && <div className="mitarbeiter-error">{error}</div>}
      {loading ? (
        <div className="mitarbeiter-loading">Lädt…</div>
      ) : sorted.length === 0 ? (
        <div className="mitarbeiter-empty">Keine Einträge gefunden.</div>
      ) : (
        <div className="mitarbeiter-table-wrap">
          <table className="mitarbeiter-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Einsatzort</th>
                <th>Telefon</th>
              </tr>
            </thead>
            <tbody>{renderRows(sorted)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MitarbeiterOverview;
