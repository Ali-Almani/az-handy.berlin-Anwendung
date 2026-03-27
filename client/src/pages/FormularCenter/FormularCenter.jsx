import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Login from '../Auth/Login';
import { getFormularCenterItems } from '../../services/formularCenter.service';
import './FormularCenter.scss';

const FormularCenter = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getFormularCenterItems();
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Liste konnte nicht geladen werden.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) {
    return <Login />;
  }

  return (
    <div className="formular-center-page">
      <div className="card formular-center-card">
        <div className="card-header">
          <h2 className="card-title">Formular Center</h2>
        </div>
        <div className="card-body">
          <p className="formular-center-intro">
            Hier finden Sie alle vom Administrator im Dashboard bereitgestellten Formulare als PDF. Klicken Sie auf
            den Dateinamen zum Öffnen oder Herunterladen.
          </p>

          {error && <p className="text-error formular-center-error">{error}</p>}

          {loading ? (
            <p>Lade Formulare…</p>
          ) : items.length === 0 ? (
            <p className="text-muted formular-center-empty">Noch keine PDF-Formulare hinterlegt.</p>
          ) : (
            <ul className="formular-center-list">
              {items.map((it) => (
                <li key={it.id} className="formular-center-item">
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="formular-center-link"
                  >
                    {it.originalName || 'Formular.pdf'}
                  </a>
                  <div className="formular-center-meta">
                    {it.uploadedAt &&
                      new Date(it.uploadedAt).toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    {it.uploadedByName ? ` · ${it.uploadedByName}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormularCenter;
