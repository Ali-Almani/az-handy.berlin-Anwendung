import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDashboardNote, saveDashboardNote, getNewsArchive, updateNewsArchiveEntry, deleteNewsArchiveEntry, getSiteNews, saveSiteNews, uploadNewsMedia } from '../../services/dashboard.service';
import { canAccessDashboard, canShowExcelUpload, canShowDashboardNotes } from '../../utils/roles';
import { isAdmin } from '../../utils/roles';
import { getSocket } from '../../services/socket';
import TextEditor from '../../components/TextEditor/TextEditor';
import ExcelUpload from '../../components/ExcelUpload/ExcelUpload';
import PerformanceDashboard from '../../components/PerformanceDashboard/PerformanceDashboard';
import { sanitizeRichTextHtml } from '../../utils/sanitizeRichTextHtml';
import './Dashboard.scss';

const Dashboard = () => {
  const { user } = useAuth();
  const [metricsMeta, setMetricsMeta] = useState(null);
  const [noteContent, setNoteContent] = useState('');
  const [noteLoading, setNoteLoading] = useState(true);
  const [noteError, setNoteError] = useState(null);
  const [archive, setArchive] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [siteNewsContent, setSiteNewsContent] = useState('');
  const [siteNewsLoading, setSiteNewsLoading] = useState(true);
  const [siteNewsError, setSiteNewsError] = useState(null);
  const [siteNewsEditorKey, setSiteNewsEditorKey] = useState(0);

  useEffect(() => {
    if (!user?.id || !canShowDashboardNotes(user)) return;
    const fetchNote = async () => {
      try {
        setNoteLoading(true);
        setNoteError(null);
        const response = await getDashboardNote();
        setNoteContent(response.data?.content ?? '');
      } catch (error) {
        console.error('Error fetching note:', error);
        setNoteError('Notiz konnte nicht geladen werden.');
      } finally {
        setNoteLoading(false);
      }
    };
    fetchNote();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !isAdmin(user)) return;
    const fetchArchive = async (isInitial = true) => {
      try {
        if (isInitial) setArchiveLoading(true);
        const res = await getNewsArchive();
        setArchive(res.data?.messages ?? []);
      } catch {
        setArchive([]);
      } finally {
        if (isInitial) setArchiveLoading(false);
      }
    };
    fetchArchive(true);
    const id = setInterval(() => fetchArchive(false), 3000);
    const socket = getSocket();
    const onNewsNew = () => fetchArchive(false);
    if (socket) socket.on('news:new', onNewsNew);
    return () => {
      clearInterval(id);
      if (socket) socket.off('news:new', onNewsNew);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (!isAdmin(user)) {
      setSiteNewsLoading(false);
      return;
    }
    const loadSiteNews = async () => {
      try {
        setSiteNewsLoading(true);
        setSiteNewsError(null);
        const res = await getSiteNews();
        setSiteNewsContent(res.data?.content ?? '');
      } catch (e) {
        console.error(e);
        setSiteNewsError('NEWS konnte nicht geladen werden.');
      } finally {
        setSiteNewsLoading(false);
      }
    };
    loadSiteNews();
  }, [user?.id, user?.role]);

  if (!canAccessDashboard(user)) {
    return <Navigate to="/" replace />;
  }

  const handleSave = async (content) => {
    try {
      const trimmed = (content || '').trim();
      if (!trimmed) return;
      await saveDashboardNote(content);
      setNoteContent('');
      setEditorKey((k) => k + 1);
      if (isAdmin(user)) {
        const newMsg = {
          id: `new-${Date.now()}`,
          content: trimmed,
          createdAt: new Date().toISOString(),
          updatedAt: null,
          updatedBy: null,
          readers: []
        };
        setArchive((prev) => [newMsg, ...prev]);
        const res = await getNewsArchive();
        setArchive(res.data?.messages ?? []);
      }
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const handleSaveSiteNews = async (content) => {
    try {
      await saveSiteNews(content ?? '');
      setSiteNewsContent(content ?? '');
      setSiteNewsEditorKey((k) => k + 1);
    } catch (error) {
      console.error('Error saving NEWS:', error);
    }
  };

  const uploadNewsFile = async (file) => {
    const res = await uploadNewsMedia(file);
    return res.data?.url;
  };

  const handleStartEditArchive = (m) => {
    setEditingId(m.id);
    setEditingContent(m.content || '');
  };

  const handleSaveEditArchive = async (id) => {
    try {
      await updateNewsArchiveEntry(id, editingContent, user?.name);
      const now = new Date().toISOString();
      setArchive((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, content: editingContent, updatedAt: now, updatedBy: user?.name }
            : item
        )
      );
      setEditingId(null);
      setEditingContent('');
    } catch (error) {
      console.error('Error updating message:', error);
    }
  };

  const handleCancelEditArchive = () => {
    setEditingId(null);
    setEditingContent('');
  };

  const handleDeleteArchive = async (id) => {
    try {
      await deleteNewsArchiveEntry(id);
      setArchive((prev) => prev.filter((m) => m.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setEditingContent('');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  return (
    <div className="dashboard">
      {isAdmin(user) && (
        <div className="card dashboard-performance">
          <div className="card-header card-header--kennzahlen">
            <h2 className="card-title">Kennzahlen</h2>
            <PerformanceDashboard
              isAdmin={isAdmin(user)}
              metaInHeader
              onMetricsLoaded={setMetricsMeta}
            />
          </div>
        </div>
      )}

      {isAdmin(user) && canShowDashboardNotes(user) && (
        <div className="card dashboard-site-news">
          <div className="card-header">
            <h2 className="card-title">NEWS</h2>
            <p className="dashboard-site-news-hint">
              Erscheint auf der Startseite für alle Benutzer. Bilder über den Button „Bild“ einfügen.
            </p>
          </div>
          <div className="card-body">
            {siteNewsError && <p className="text-error">{siteNewsError}</p>}
            {siteNewsLoading ? (
              <p>Lade NEWS…</p>
            ) : (
              <TextEditor
                key={siteNewsEditorKey}
                initialContent={siteNewsContent}
                onSave={handleSaveSiteNews}
                placeholder="NEWS für die Startseite verfassen…"
                mediaUpload={{ uploadFile: uploadNewsFile }}
              />
            )}
          </div>
        </div>
      )}

      {isAdmin(user) && canShowDashboardNotes(user) && (
        <div className="card dashboard-new-message">
          <div className="card-header">
            <h2 className="card-title">Anweisung schreiben</h2>
          </div>
          <div className="card-body">
            {noteError && <p className="text-error">{noteError}</p>}
            {noteLoading ? (
              <p>Lade...</p>
            ) : (
              <TextEditor
                key={editorKey}
                initialContent={noteContent}
                onSave={handleSave}
                placeholder="schreiben Sie hier Ihre Anweisung ."
              />
            )}
          </div>
        </div>
      )}

      {isAdmin(user) && (
        <div className="card dashboard-archive">
          <div className="card-header">
            <h2 className="card-title">Alte Anweisung</h2>
          </div>
          <div className="card-body">
            {archiveLoading ? (
              <p>Lade Archiv...</p>
            ) : archive.length === 0 ? (
              <p className="text-muted">Keine vergangenen Nachrichten.</p>
            ) : (
              <ul className="dashboard-archive-list">
                {archive.map((m) => (
                  <li key={m.id} className="dashboard-archive-item">
                    {editingId === m.id ? (
                      <>
                        <textarea
                          className="dashboard-archive-edit-input"
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          rows={4}
                          placeholder="Nachricht bearbeiten..."
                        />
                        <div className="dashboard-archive-actions">
                          <button
                            type="button"
                            className="btn btn--primary btn--small"
                            onClick={() => handleSaveEditArchive(m.id)}
                            aria-label="Änderungen speichern"
                          >
                            Speichern
                          </button>
                          <button
                            type="button"
                            className="btn btn--outline btn--small"
                            onClick={handleCancelEditArchive}
                            aria-label="Abbrechen"
                          >
                            Abbrechen
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          className="dashboard-archive-content"
                          dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(m.content || '') }}
                        />
                        {m.createdAt && (
                          <div className="dashboard-archive-date">
                            Erstellt: {new Date(m.createdAt).toLocaleString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
                        {m.updatedAt && (
                          <div className="dashboard-archive-edited">
                            Bearbeitet am {new Date(m.updatedAt).toLocaleString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                            {m.updatedBy && ` von ${m.updatedBy}`}
                          </div>
                        )}
                        {m.readers?.length > 0 ? (
                          <div className="dashboard-archive-readers">
                            Gelesen von: {m.readers.map((r) => r.userName).join(', ')}
                          </div>
                        ) : (
                          <div className="dashboard-archive-readers">Noch von niemandem gelesen.</div>
                        )}
                        <div className="dashboard-archive-actions">
                          <button
                            type="button"
                            className="btn btn--outline btn--small"
                            onClick={() => handleStartEditArchive(m)}
                            aria-label="Nachricht bearbeiten"
                          >
                            Bearbeiten
                          </button>
                          <button
                            type="button"
                            className="btn btn--danger btn--small"
                            onClick={() => handleDeleteArchive(m.id)}
                            aria-label="Nachricht löschen"
                          >
                            Löschen
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {canShowExcelUpload(user) && <ExcelUpload />}
    </div>
  );
};

export default Dashboard;
