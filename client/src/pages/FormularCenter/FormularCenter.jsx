import { useCallback, useEffect, useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { isAdmin } from '../../utils/roles';
import Login from '../Auth/Login';
import {
  getFormularCenterItems,
  uploadFormularCenterPdf,
  deleteFormularCenterItem
} from '../../services/formularCenter.service';
import './FormularCenter.scss';

const FormularCenter = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const fileInputRef = useRef(null);

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

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !isAdmin(user)) return;
    setUploadBusy(true);
    setError(null);
    try {
      await uploadFormularCenterPdf(file);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Upload fehlgeschlagen.');
    } finally {
      setUploadBusy(false);
    }
  };

  const handleDelete = async (id) => {
    if (!id || !isAdmin(user)) return;
    if (!window.confirm('Dieses Formular wirklich löschen?')) return;
    setDeleteId(id);
    setError(null);
    try {
      await deleteFormularCenterItem(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Löschen fehlgeschlagen.');
    } finally {
      setDeleteId(null);
    }
  };

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
            Hier finden Sie alle vom Administrator bereitgestellten Formulare als PDF. Klicken Sie auf den Dateinamen
            zum Öffnen oder Herunterladen.
          </p>

          {isAdmin(user) && (
            <div className="formular-center-upload">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="formular-center-file-input"
                onChange={handleFileChange}
              />
              <button
                type="button"
                className="btn btn--primary btn--small"
                disabled={uploadBusy}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadBusy ? 'Wird hochgeladen…' : 'PDF hochladen'}
              </button>
              <span className="formular-center-upload-hint">Nur Administrator · max. 30 MB · PDF</span>
            </div>
          )}

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
                  {isAdmin(user) && (
                    <button
                      type="button"
                      className="btn btn--danger btn--small formular-center-delete"
                      disabled={deleteId === it.id}
                      onClick={() => handleDelete(it.id)}
                    >
                      {deleteId === it.id ? '…' : 'Löschen'}
                    </button>
                  )}
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
