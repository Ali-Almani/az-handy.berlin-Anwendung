import { useCallback, useEffect, useState } from 'react';
import { getFormularCenterItems, getFormularCenterDownloadHref } from '../../services/formularCenter.service';
import './FormularCenter.scss';

function safeDownloadName(name) {
  const n = String(name || 'dokument').trim() || 'dokument';
  return n.replace(/[/\\?%*:|"<>]/g, '_');
}

const FormularCenter = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getFormularCenterItems();
      setSections(Array.isArray(res.data?.sections) ? res.data.sections : []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Liste konnte nicht geladen werden.');
      setSections([]);
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
          <h2 className="card-title formular-center-page-title">Formular Center</h2>
        </div>
        <div className="card-body">
          {error && <p className="text-error formular-center-error">{error}</p>}

          {loading ? (
            <p>Lade Formulare…</p>
          ) : sections.length > 0 ? (
            <>
              <p className="formular-center-hint">
                PDF, Word und Excel: zum Bearbeiten „Herunterladen“ wählen und in der passenden App öffnen.
              </p>
              <div className="formular-center-sections-public">
                {sections.map((sec) => (
                  <section key={sec.id} className="formular-center-section-block formular-center-section-block--public">
                    <h3 className="formular-center-section-heading formular-center-section-heading--public">
                      {sec.title || 'Bereich'}
                    </h3>
                    {(sec.items || []).length > 0 ? (
                      <ul className="formular-center-list">
                        {(sec.items || []).map((it) => {
                          const label = it.originalName || 'Dokument';
                          const desc = String(it.description || '').trim();
                          const href = it.id ? getFormularCenterDownloadHref(it.id) : '#';
                          const fileName = safeDownloadName(label);
                          return (
                            <li key={it.id} className="formular-center-item">
                              <span className="formular-center-item-name">
                                {label}
                                {desc && <span className="formular-center-item-desc"> – {desc}</span>}
                              </span>
                              <span className="formular-center-item-actions">
                                <a
                                  href={href}
                                  download={fileName}
                                  className="formular-center-link formular-center-link--download"
                                >
                                  Herunterladen
                                </a>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="formular-center-section-empty">In diesem Bereich sind noch keine Dateien.</p>
                    )}
                  </section>
                ))}
              </div>
            </>
          ) : (
            <p className="formular-center-empty">Keine Formulare hinterlegt.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormularCenter;
