import { useCallback, useEffect, useState } from 'react';
import { getFormularCenterItems } from '../../services/formularCenter.service';
import './FormularCenter.scss';

function safeDownloadName(name) {
  const n = String(name || 'formular.pdf').trim() || 'formular.pdf';
  return n.replace(/[/\\?%*:|"<>]/g, '_');
}

const FormularCenter = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="formular-center-page">
      <div className="card formular-center-card">
        <div className="card-header">
          <h2 className="card-title">Formular Center</h2>
        </div>
        <div className="card-body">
          {error && <p className="text-error formular-center-error">{error}</p>}

          {loading ? (
            <p>Lade Formulare…</p>
          ) : items.length > 0 ? (
            <ul className="formular-center-list">
              {items.map((it) => {
                const label = it.originalName || 'Formular.pdf';
                const href = it.url || '#';
                const fileName = safeDownloadName(label);
                return (
                  <li key={it.id} className="formular-center-item">
                    <span className="formular-center-item-name">{label}</span>
                    <span className="formular-center-item-actions">
                      <a href={href} download={fileName} className="formular-center-link formular-center-link--download">
                        Herunterladen
                      </a>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default FormularCenter;
