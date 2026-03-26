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

/** Admin-Sidebar: ein Bereich aktiv */
const SEC_KENNZAHLEN = 'kennzahlen';
const SEC_NEWS = 'news';
const SEC_ANWEISUNG = 'anweisung';
const SEC_BENUTZERVERWALTUNG = 'benutzerverwaltung';
const SEC_EXCEL = 'excel';

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
  /** Wenn gesetzt: Editor speichert in diesen Archiv-Eintrag (updateSiteNewsHistoryEntry), nicht in die Live-NEWS */
  const [siteNewsHistoryEditId, setSiteNewsHistoryEditId] = useState(null);
  const [siteNewsAlteOpen, setSiteNewsAlteOpen] = useState(false);
  /** Pro Archiv-Eintrag: eingeklappt bis Klick auf Datumszeile */
  const [openAlteNewsEntryIds, setOpenAlteNewsEntryIds] = useState({});
  const [adminSection, setAdminSection] = useState(SEC_KENNZAHLEN);
  const alteNewsPanelId = useId();

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
    const loadSiteNewsHistory = async (withLoading = true) => {
      try {
        if (withLoading) setSiteNewsHistoryLoading(true);
        const res = await getSiteNewsHistory();
        setSiteNewsHistory(res.data?.entries ?? []);
      } catch {
        setSiteNewsHistory([]);
      } finally {
        if (withLoading) setSiteNewsHistoryLoading(false);
      }
    };
    loadSiteNews();
    loadSiteNewsHistory(true);
    const socket = getSocket();
    const refreshAlteNewsQuiet = () => loadSiteNewsHistory(false);
    if (socket) {
      socket.on('siteNews:updated', refreshAlteNewsQuiet);
      socket.on('siteNewsHistory:updated', refreshAlteNewsQuiet);
    }
    return () => {
      if (socket) {
        socket.off('siteNews:updated', refreshAlteNewsQuiet);
        socket.off('siteNewsHistory:updated', refreshAlteNewsQuiet);
      }
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

  const reloadSiteNewsHistory = async () => {
    try {
      const res = await getSiteNewsHistory();
      setSiteNewsHistory(res.data?.entries ?? []);
    } catch {
      /* Archivliste bleibt unverändert */
    }
  };

  const handleSaveSiteNews = async (content) => {
    try {
      if (siteNewsHistoryEditId) {
        await updateSiteNewsHistoryEntry(siteNewsHistoryEditId, content ?? '');
        setSiteNewsHistoryEditId(null);
        setSiteNewsContent('');
        setSiteNewsEditorKey((k) => k + 1);
        await reloadSiteNewsHistory();
        return;
      }
      await saveSiteNews(content ?? '');
      setSiteNewsContent('');
      setSiteNewsEditorKey((k) => k + 1);
      await reloadSiteNewsHistory();
      setSiteNewsAlteOpen(true);
    } catch (error) {
      console.error('Error saving NEWS:', error);
    }
  };

  const toggleAlteNewsEntry = (id) => {
    setOpenAlteNewsEntryIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartEditSiteNewsHist = (entry) => {
    setOpenAlteNewsEntryIds((prev) => ({ ...prev, [entry.id]: true }));
    setSiteNewsHistoryEditId(entry.id);
    setSiteNewsContent(entry.content || '');
    setSiteNewsEditorKey((k) => k + 1);
  };

  const handleCancelSiteNewsHistoryEdit = async () => {
    setSiteNewsHistoryEditId(null);
    try {
      const res = await getSiteNews();
      setSiteNewsContent(res.data?.content ?? '');
    } catch {
      setSiteNewsContent('');
    }
    setSiteNewsEditorKey((k) => k + 1);
  };

  const handleDeleteSiteNewsHist = async (id) => {
    try {
      await deleteSiteNewsHistoryEntry(id);
      setSiteNewsHistory((prev) => prev.filter((e) => e.id !== id));
      setOpenAlteNewsEntryIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (siteNewsHistoryEditId === id) {
        setSiteNewsHistoryEditId(null);
        try {
          const res = await getSiteNews();
          setSiteNewsContent(res.data?.content ?? '');
        } catch {
          setSiteNewsContent('');
        }
        setSiteNewsEditorKey((k) => k + 1);
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

  const navBtnClass = (section) =>
    `dashboard-admin-nav__item${adminSection === section ? ' is-active' : ''}`;

  return (
    <div className="dashboard">
      {isAdmin(user) && (
        <div className="dashboard-admin-layout">
          <aside className="dashboard-admin-sidebar">
            <nav className="dashboard-admin-nav" aria-label="Admin-Dashboard">
              <ul className="dashboard-admin-nav__list">
                <li>
                  <button
                    type="button"
                    className={navBtnClass(SEC_KENNZAHLEN)}
                    onClick={() => setAdminSection(SEC_KENNZAHLEN)}
                    aria-current={adminSection === SEC_KENNZAHLEN ? 'page' : undefined}
                  >
                    Kennzahlen
                  </button>
                </li>
                {canShowDashboardNotes(user) && (
                  <>
                    <li>
                      <button
                        type="button"
                        className={navBtnClass(SEC_NEWS)}
                        onClick={() => setAdminSection(SEC_NEWS)}
                        aria-current={adminSection === SEC_NEWS ? 'page' : undefined}
                      >
                        NEWS
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={navBtnClass(SEC_ANWEISUNG)}
                        onClick={() => setAdminSection(SEC_ANWEISUNG)}
                        aria-current={adminSection === SEC_ANWEISUNG ? 'page' : undefined}
                      >
                        Anweisung
                      </button>
                    </li>
                  </>
                )}
                <li>
                  <button
                    type="button"
                    className={navBtnClass(SEC_BENUTZERVERWALTUNG)}
                    onClick={() => setAdminSection(SEC_BENUTZERVERWALTUNG)}
                    aria-current={adminSection === SEC_BENUTZERVERWALTUNG ? 'page' : undefined}
                  >
                    Benutzerverwaltung
                  </button>
                </li>
                {canShowExcelUpload(user) && (
                  <li>
                    <button
                      type="button"
                      className={navBtnClass(SEC_EXCEL)}
                      onClick={() => setAdminSection(SEC_EXCEL)}
                      aria-current={adminSection === SEC_EXCEL ? 'page' : undefined}
                    >
                      IMEs Excel-Datei hochladen
                    </button>
                  </li>
                )}
              </ul>
            </nav>
          </aside>
          <div className="dashboard-admin-main">
            {adminSection === SEC_KENNZAHLEN && (
              <div className="card dashboard-performance dashboard-admin-panel">
                <div className="dashboard-admin-panel__header">
                  <h2 className="card-title">Kennzahlen</h2>
                </div>
                <div className="card-header card-header--kennzahlen dashboard-performance__panel-header">
                  <PerformanceDashboard
                    isAdmin={isAdmin(user)}
                    metaInHeader
                    onMetricsLoaded={setMetricsMeta}
                  />
                </div>
              </div>
            )}

            {adminSection === SEC_NEWS && canShowDashboardNotes(user) && (
              <div className="card dashboard-site-news dashboard-admin-panel">
                <div className="dashboard-admin-panel__header">
                  <h2 className="card-title">NEWS</h2>
                </div>
                <p className="dashboard-site-news-hint dashboard-site-news-hint--in-panel">
                  Erscheint auf der Startseite für alle Benutzer. Bilder über den Button „Bild“ einfügen.
                </p>
                <div className="card-body">
                  {siteNewsError && <p className="text-error">{siteNewsError}</p>}
                  {siteNewsLoading ? (
                    <p>Lade NEWS…</p>
                  ) : (
                    <>
                      {siteNewsHistoryEditId && (
                        <div className="dashboard-site-news-archive-hint">
                          <p>
                            Sie bearbeiten einen Eintrag aus „Archiv NEWS“ im Editor oben. Speichern übernimmt nur
                            diesen Archiv-Eintrag, nicht die aktuelle Startseiten-NEWS.
                          </p>
                          <button
                            type="button"
                            className="btn btn--outline btn--small"
                            onClick={handleCancelSiteNewsHistoryEdit}
                          >
                            Archiv-Bearbeitung abbrechen
                          </button>
                        </div>
                      )}
                      <TextEditor
                        key={siteNewsEditorKey}
                        initialContent={siteNewsContent}
                        onSave={handleSaveSiteNews}
                        placeholder="NEWS für die Startseite verfassen…"
                        mediaUpload={{ uploadFile: uploadNewsFile }}
                      />
                    </>
                  )}
                  <div className="dashboard-site-news-history dashboard-site-news-history--collapsible dashboard-accordion dashboard-archive">
                    <button
                      type="button"
                      className="dashboard-accordion-trigger dashboard-site-news-alte-trigger"
                      aria-expanded={siteNewsAlteOpen}
                      aria-controls={alteNewsPanelId}
                      id={`${alteNewsPanelId}-trigger`}
                      onClick={() => setSiteNewsAlteOpen((o) => !o)}
                    >
                      <h3 className="card-title">Archiv NEWS</h3>
                      <span className="dashboard-accordion-chevron" aria-hidden>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </button>
                    <div
                      id={alteNewsPanelId}
                      className="dashboard-accordion-panel dashboard-site-news-history-body"
                      role="region"
                      aria-labelledby={`${alteNewsPanelId}-trigger`}
                      hidden={!siteNewsAlteOpen}
                    >
                      {siteNewsHistoryLoading ? (
                        <p>Lade Archiv…</p>
                      ) : siteNewsHistory.length === 0 ? (
                        <p className="text-muted">
                          Noch keine NEWS im Archiv. Sobald Sie eine NEWS schreiben und speichern, erscheint sie hier (und
                          bei weiteren Änderungen die jeweils vorherige Fassung).
                        </p>
                      ) : (
                        <ul className="dashboard-archive-list dashboard-alte-news-archive-list">
                          {siteNewsHistory.map((entry) => {
                            const alteNewsEntryOpen = !!openAlteNewsEntryIds[entry.id];
                            const dateStr = entry.updatedAt
                              ? new Date(entry.updatedAt).toLocaleString('de-DE', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : null;
                            const triggerId = `alte-news-entry-${entry.id}-trigger`;
                            const panelId = `alte-news-entry-${entry.id}-panel`;
                            return (
                              <li
                                key={entry.id}
                                className={`dashboard-archive-item dashboard-alte-news-archive-item${siteNewsHistoryEditId === entry.id ? ' dashboard-archive-item--active-in-editor' : ''}`}
                              >
                                <button
                                  type="button"
                                  className="dashboard-alte-news-entry-trigger"
                                  aria-expanded={alteNewsEntryOpen}
                                  aria-controls={panelId}
                                  id={triggerId}
                                  onClick={() => toggleAlteNewsEntry(entry.id)}
                                >
                                  <span className="dashboard-alte-news-entry-date">
                                    {dateStr ? `Stand: ${dateStr}` : 'Archiv-Eintrag'}
                                    <span className="dashboard-alte-news-entry-hint"> – anklicken zum Öffnen</span>
                                  </span>
                                  <span className="dashboard-accordion-chevron" aria-hidden>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </span>
                                </button>
                                <div
                                  id={panelId}
                                  className="dashboard-accordion-panel dashboard-alte-news-entry-panel"
                                  role="region"
                                  aria-labelledby={triggerId}
                                  hidden={!alteNewsEntryOpen}
                                >
                                  <div
                                    className="dashboard-archive-content"
                                    dangerouslySetInnerHTML={{ __html: entry.content || '' }}
                                  />
                                  <div className="dashboard-archive-actions">
                                    <button
                                      type="button"
                                      className="btn btn--outline btn--small"
                                      onClick={() => {
                                        setSiteNewsAlteOpen(true);
                                        handleStartEditSiteNewsHist(entry);
                                      }}
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
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {adminSection === SEC_ANWEISUNG && canShowDashboardNotes(user) && (
              <div className="card dashboard-new-message dashboard-admin-panel">
                <div className="dashboard-admin-panel__header">
                  <h2 className="card-title">Anweisung</h2>
                </div>
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
            )}

            {adminSection === SEC_BENUTZERVERWALTUNG && (
              <div className="card dashboard-user-management dashboard-admin-panel">
                <div className="dashboard-admin-panel__header">
                  <h2 className="card-title">Benutzerverwaltung</h2>
                </div>
                <div className="dashboard-user-management-panel">
                  <UserManagement compact />
                </div>
              </div>
            )}

            {adminSection === SEC_EXCEL && canShowExcelUpload(user) && <ExcelUpload />}
          </div>
        </div>
      )}

      {!isAdmin(user) && canShowExcelUpload(user) && <ExcelUpload />}
    </div>
  );
};

export default Dashboard;
