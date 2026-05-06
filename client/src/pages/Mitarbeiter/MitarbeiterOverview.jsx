import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getUserDirectory } from '../../services/user.service';
import { sortUsersByEinsatzOrt } from '../../utils/roles';
import './Mitarbeiter.scss';

const isAliTest = (u) => String(u?.name || '').trim().toLowerCase() === 'ali test';

const renderRows = (rows) =>
  rows.map((u) => (
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
    </tr>
  ));

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

  const { mainUsers, compactUsers } = useMemo(() => {
    const sorted = sortUsersByEinsatzOrt(users.filter((u) => !isAliTest(u)));
    const mainUsersInner = sorted.filter((u) => !u.isPartner && Boolean(String(u.einsatz_ort || '').trim()));
    const compactUsersInner = sorted.filter((u) => u.isPartner || !String(u.einsatz_ort || '').trim());
    return { mainUsers: mainUsersInner, compactUsers: compactUsersInner };
  }, [users]);

  const hasAny = mainUsers.length > 0 || compactUsers.length > 0;

  return (
    <div className="mitarbeiter-page">
      <header className="mitarbeiter-page__header">
        <h1>Mitarbeiter Übersicht</h1>
      </header>
      {error && <div className="mitarbeiter-error">{error}</div>}
      {loading ? (
        <div className="mitarbeiter-loading">Lädt…</div>
      ) : !hasAny ? (
        <div className="mitarbeiter-empty">Keine Einträge gefunden.</div>
      ) : (
        <>
          {mainUsers.length > 0 && (
            <div className="mitarbeiter-table-wrap mitarbeiter-table-wrap--main">
              <table className="mitarbeiter-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Einsatzort</th>
                  </tr>
                </thead>
                <tbody>{renderRows(mainUsers)}</tbody>
              </table>
            </div>
          )}
          {compactUsers.length > 0 && (
            <section className="mitarbeiter-section mitarbeiter-section--compact">
              <h2 className="mitarbeiter-subheading">Partner / ohne Einsatzort</h2>
              <div className="mitarbeiter-table-wrap mitarbeiter-table-wrap--compact">
                <table className="mitarbeiter-table mitarbeiter-table--compact">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Einsatzort</th>
                    </tr>
                  </thead>
                  <tbody>{renderRows(compactUsers)}</tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default MitarbeiterOverview;
