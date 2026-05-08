import { useEffect, useMemo, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getMitarbeiterShopTshirtGroessenForMarketing } from '../../services/user.service';
import { isMarketing, sortUsersByEinsatzOrt } from '../../utils/roles';
import '../Mitarbeiter/Mitarbeiter.scss';

const MarketingShopTshirtGroessen = () => {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !user || !isMarketing(user)) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getMitarbeiterShopTshirtGroessenForMarketing();
        if (!cancelled) setRows(res.data.users || []);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || 'Daten konnten nicht geladen werden');
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, user]);

  const sorted = useMemo(() => sortUsersByEinsatzOrt(rows), [rows]);

  if (authLoading) {
    return (
      <div className="mitarbeiter-page mitarbeiter-page--overview">
        <div className="mitarbeiter-loading">Lädt…</div>
      </div>
    );
  }

  if (!user || !isMarketing(user)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mitarbeiter-page mitarbeiter-page--overview">
      <header className="mitarbeiter-page__header">
        <h1>T-Shirt-Größen – Mitarbeiter Shop</h1>
      </header>
      {error && <div className="mitarbeiter-error">{error}</div>}
      {loading ? (
        <div className="mitarbeiter-loading">Lädt…</div>
      ) : sorted.length === 0 ? (
        <div className="mitarbeiter-empty">Keine Mitarbeiter Shop gefunden.</div>
      ) : (
        <div className="mitarbeiter-table-wrap">
          <table className="mitarbeiter-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Einsatzort</th>
                <th>T-Shirt-Größe</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link to={`/mitarbeiter/${u.id}`} className="mitarbeiter-cell-user">
                      <span>{u.name}</span>
                    </Link>
                  </td>
                  <td>{u.einsatz_ort?.trim() ? u.einsatz_ort : '–'}</td>
                  <td>{u.tshirt_groesse?.trim() ? u.tshirt_groesse : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MarketingShopTshirtGroessen;
