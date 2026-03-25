import { useEffect, useState, useId } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  getDashboardNote,
  saveDashboardNote,
  getNewsArchive,
  updateNewsArchiveEntry,
  deleteNewsArchiveEntry,
  getSiteNews,
  saveSiteNews,
  getSiteNewsHistory,
  updateSiteNewsHistoryEntry,
  deleteSiteNewsHistoryEntry,
  uploadNewsMedia
} from '../../services/dashboard.service';
import { canAccessDashboard, canShowExcelUpload, canShowDashboardNotes } from '../../utils/roles';
import { isAdmin } from '../../utils/roles';
import { getSocket } from '../../services/socket';
import TextEditor from '../../components/TextEditor/TextEditor';
import ExcelUpload from '../../components/ExcelUpload/ExcelUpload';
import PerformanceDashboard from '../../components/PerformanceDashboard/PerformanceDashboard';
import UserManagement from '../../components/UserManagement/UserManagement';
import './Dashboard.scss';

/** Nur ein Admin-Accordion gleichzeitig offen */
const ACC_KENNZAHLEN = 'kennzahlen';
const ACC_NEWS = 'news';
const ACC_ANWEISUNG = 'anweisung';
const ACC_BENUTZERVERWALTUNG = 'benutzerverwaltung';

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
  const [siteNewsHistory, setSiteNewsHistory] = useState([]);
  const [siteNewsHistoryLoading, setSiteNewsHistoryLoading] = useState(false);
  const [siteNewsHistEditingId, setSiteNewsHistEditingId] = useState(null);
  const [siteNewsHistEditingContent, setSiteNewsHistEditingContent] = useState('');
  const [openAdminAccordion, setOpenAdminAccordion] = useState(null);
  const kennzahlenPanelId = useId();
  const newsPanelId = useId();
  const anweisungPanelId = useId();
  const benutzerverwaltungPanelId = useId();

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
    const loadSiteNewsHistory = async () => {
      try {
        setSiteNewsHistoryLoading(true);
        const res = await getSiteNewsHistory();
        setSiteNewsHistory(res.data?.entries ?? []);
      } catch {
        setSiteNewsHistory([]);
      } finally {
        setSiteNewsHistoryLoading(false);
      }
    };
    loadSiteNews();
    loadSiteNewsHistory();
    const socket = getSocket();
    const onSiteNewsUpdated = () => {
      loadSiteNewsHistory();
    };
    if (socket) socket.on('siteNews:updated', onSiteNewsUpdated);
    return () => {
      if (socket) socket.off('siteNews:updated', onSiteNewsUpdated);
    };
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
      try {
        const res = await getSiteNewsHistory();
        setSiteNewsHistory(res.data?.entries ?? []);
      } catch {
        /* Archivliste bleibt unverändert */
      }
    } catch (error) {
      console.error('Error saving NEWS:', error);
    }
  };

  const handleStartEditSiteNewsHist = (entry) => {
    setSiteNewsHistEditingId(entry.id);
    setSiteNewsHistEditingContent(entry.content || '');
  };

  const handleSaveEditSiteNewsHist = async (id) => {
    try {
      await updateSiteNewsHistoryEntry(id, siteNewsHistEditingContent);
      const now = new Date().toISOString();
      setSiteNewsHistory((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, content: siteNewsHistEditingContent, updatedAt: now }
            : item
        )
      );
      setSiteNewsHistEditingId(null);
      setSiteNewsHistEditingContent('');
    } catch (error) {
      console.error('Error updating NEWS archive:', error);
    }
  };

  const handleCancelEditSiteNewsHist = () => {
    setSiteNewsHistEditingId(null);
    setSiteNewsHistEditingContent('');
  };

  const handleDeleteSiteNewsHist = async (id) => {
    try {
      await deleteSiteNewsHistoryEntry(id);
      setSiteNewsHistory((prev) => prev.filter((e) => e.id !== id));
      if (siteNewsHistEditingId === id) {
        setSiteNewsHistEditingId(null);
        setSiteNewsHistEditingContent('');
      }
    } catch (error) {
      console.error('Error deleting NEWS archive entry:', error);
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

  const toggleAdminAccordion = (section) => {
    setOpenAdminAccordion((prev) => (prev === section ? null : section));
  };

  const accordionKennzahlen = openAdminAccordion === ACC_KENNZAHLEN;
  const accordionNews = openAdminAccordion === ACC_NEWS;
  const accordionAnweisung = openAdminAccordion === ACC_ANWEISUNG;
  const accordionBenutzerverwaltung = openAdminAccordion === ACC_BENUTZERVERWALTUNG;

  return (
    <div className="dashboard">
      {isAdmin(user) && (
        <div className="card dashboard-performance dashboard-accordion">
          <button
            type="button"
            className="dashboard-accordion-trigger"
            aria-expanded={accordionKennzahlen}
            aria-controls={kennzahlenPanelId}
            id={`${kennzahlenPanelId}-trigger`}
            onClick={() => toggleAdminAccordion(ACC_KENNZAHLEN)}
          >
            <h2 className="card-title">Kennzahlen</h2>
            <span className="dashboard-accordion-chevron" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
          <div
            id={kennzahlenPanelId}
            className="dashboard-accordion-panel"
            role="region"
            aria-labelledby={`${kennzahlenPanelId}-trigger`}
            hidden={!accordionKennzahlen}
          >
            <div className="card-header card-header--kennzahlen dashboard-performance__panel-header">
              <PerformanceDashboard
                isAdmin={isAdmin(user)}
                metaInHeader
                onMetricsLoaded={setMetricsMeta}
              />
            </div>
          </div>
        </div>
      )}

      {isAdmin(user) && canShowDashboardNotes(user) && (
        <div className="card dashboard-site-news dashboard-accordion">
          <button
            type="button"
            className="dashboard-accordion-trigger"
            aria-expanded={accordionNews}
            aria-controls={newsPanelId}
            id={`${newsPanelId}-trigger`}
            onClick={() => toggleAdminAccordion(ACC_NEWS)}
          >
            <h2 className="card-title">NEWS</h2>
            <span className="dashboard-accordion-chevron" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
          <div
            id={newsPanelId}
            className="dashboard-accordion-panel"
            role="region"
            aria-labelledby={`${newsPanelId}-trigger`}
            hidden={!accordionNews}
          >
            <p className="dashboard-site-news-hint dashboard-site-news-hint--in-panel">
              Erscheint auf der Startseite für alle Benutzer. Bilder über den Button „Bild“ einfügen.
            </p>
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
              <div className="dashboard-site-news-history dashboard-archive">
                <h3 className="dashboard-site-news-history-title">Frühere NEWS</h3>
                <div className="dashboard-site-news-history-body">
                  {siteNewsHistoryLoading ? (
                    <p>Lade Archiv…</p>
                  ) : siteNewsHistory.length === 0 ? (
                    <p className="text-muted">Keine älteren Versionen. Beim nächsten Speichern wird die bisherige NEWS hier abgelegt.</p>
                  ) : (
                    <ul className="dashboard-archive-list">
                      {siteNewsHistory.map((entry) => (
                        <li key={entry.id} className="dashboard-archive-item">
                          {siteNewsHistEditingId === entry.id ? (
                            <>
                              <textarea
                                className="dashboard-archive-edit-input"
                                value={siteNewsHistEditingContent}
                                onChange={(e) => setSiteNewsHistEditingContent(e.target.value)}
                                rows={4}
                                placeholder="Archiv-Eintrag bearbeiten…"
                              />
                              <div className="dashboard-archive-actions">
                                <button
                                  type="button"
                                  className="btn btn--primary btn--small"
                                  onClick={() => handleSaveEditSiteNewsHist(entry.id)}
                                >
                                  Speichern
                                </button>
                                <button
                                  type="button"
                                  className="btn btn--outline btn--small"
                                  onClick={handleCancelEditSiteNewsHist}
                                >
                                  Abbrechen
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div
                                className="dashboard-archive-content"
                                dangerouslySetInnerHTML={{ __html: entry.content || '' }}
                              />
                              {entry.updatedAt && (
                                <div className="dashboard-archive-date">
                                  Stand:{' '}
                                  {new Date(entry.updatedAt).toLocaleString('de-DE', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              )}
                              <div className="dashboard-archive-actions">
                                <button
                                  type="button"
                                  className="btn btn--outline btn--small"
                                  onClick={() => handleStartEditSiteNewsHist(entry)}
                                >
                                  Bearbeiten
                                </button>
                                <button
                                  type="button"
                                  className="btn btn--danger btn--small"
                                  onClick={() => handleDeleteSiteNewsHist(entry.id)}
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
            </div>
          </div>
        </div>
      )}

      {isAdmin(user) && (
        <div className="card dashboard-new-message dashboard-accordion">
          <button
            type="button"
            className="dashboard-accordion-trigger"
            aria-expanded={accordionAnweisung}
            aria-controls={anweisungPanelId}
            id={`${anweisungPanelId}-trigger`}
            onClick={() => toggleAdminAccordion(ACC_ANWEISUNG)}
          >
            <h2 className="card-title">Anweisung schreiben</h2>
            <span className="dashboard-accordion-chevron" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
          <div
            id={anweisungPanelId}
            className="dashboard-accordion-panel"
            role="region"
            aria-labelledby={`${anweisungPanelId}-trigger`}
            hidden={!accordionAnweisung}
          >
            {canShowDashboardNotes(user) && (
              <div className="card-body dashboard-anweisung-editor">
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
            )}
            <div className="dashboard-archive dashboard-archive--in-anweisung">
              <h3 className="dashboard-archive-in-anweisung-title">Alte Anweisung</h3>
              <div className="dashboard-archive-in-anweisung-body">
                {archiveLoading ? (
                  <p>Lade Archiv…</p>
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
                              dangerouslySetInnerHTML={{ __html: m.content || '' }}
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
          </div>
        </div>
      )}

      {isAdmin(user) && (
        <div className="card dashboard-user-management dashboard-accordion">
          <button
            type="button"
            className="dashboard-accordion-trigger"
            aria-expanded={accordionBenutzerverwaltung}
            aria-controls={benutzerverwaltungPanelId}
            id={`${benutzerverwaltungPanelId}-trigger`}
            onClick={() => toggleAdminAccordion(ACC_BENUTZERVERWALTUNG)}
          >
            <h2 className="card-title">Benutzerverwaltung</h2>
            <span className="dashboard-accordion-chevron" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
          <div
            id={benutzerverwaltungPanelId}
            className="dashboard-accordion-panel"
            role="region"
            aria-labelledby={`${benutzerverwaltungPanelId}-trigger`}
            hidden={!accordionBenutzerverwaltung}
          >
            <div className="dashboard-user-management-panel">
              <UserManagement compact />
            </div>
          </div>
        </div>
      )}

      {canShowExcelUpload(user) && <ExcelUpload />}
    </div>
  );
};

export default Dashboard;
