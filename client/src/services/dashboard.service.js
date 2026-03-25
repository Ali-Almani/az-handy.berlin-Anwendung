import api from './api';
import { mockGetAdminName } from './mockApi';

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true' ||
  import.meta.env.VITE_API_URL === 'mock' ||
  !import.meta.env.VITE_API_URL;

const STORAGE_KEY = 'dashboard-content';
const HISTORY_KEY = 'dashboard-content-history';
const NEWS_READS_KEY = 'news-reads';

const mockGetNote = async () => {
  const content = localStorage.getItem(STORAGE_KEY) || '';
  const updatedAt = localStorage.getItem(`${STORAGE_KEY}-updated`) || null;
  return { data: { success: true, content, updatedAt } };
};

const mockGetNews = async () => {
  const res = await mockGetNote();
  let content = res.data?.content ?? '';
  let updatedAt = res.data?.updatedAt ?? null;
  if (!content || !String(content).trim()) {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    const latest = history[0];
    if (latest && (latest.content || '').trim()) {
      content = latest.content || '';
      updatedAt = latest.createdAt || null;
    }
  }
  const authorName = (mockGetAdminName() || 'Ali Almani').trim();
  return { data: { ...res.data, content, updatedAt, authorName, hasRead: false } };
};

const mockSaveNote = async (content) => {
  if (content && String(content).trim()) {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift({ content: content || '', createdAt: new Date().toISOString() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
  }
  localStorage.setItem(STORAGE_KEY, '');
  localStorage.setItem(`${STORAGE_KEY}-updated`, new Date().toISOString());
  return { data: { success: true, message: 'Notiz gespeichert (lokal)' } };
};

const mockGetHistory = async () => {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  return {
    data: {
      success: true,
      history: history.map((h, i) => ({
        id: `mock-${i}`,
        content: h.content,
        createdAt: h.createdAt
      }))
    }
  };
};

export const getDashboardNote = () => {
  if (USE_MOCK_API) {
    return mockGetNote();
  }
  return api.get('/dashboard/note');
};

/** News für alle Rollen (Admin-Notiz) – für Popup bei neuer Nachricht */
export const getNews = async () => {
  if (USE_MOCK_API) {
    const res = await mockGetNews();
    return res;
  }
  return api.get('/dashboard/news');
};

/** News als gelesen markieren (für Admin-Übersicht) */
export const markNewsAsRead = (contentHash, userName) => {
  if (USE_MOCK_API) {
    try {
      const reads = JSON.parse(localStorage.getItem(NEWS_READS_KEY) || '[]');
      reads.unshift({ userName: userName || 'Unbekannt', readAt: new Date().toISOString(), contentHash });
      localStorage.setItem(NEWS_READS_KEY, JSON.stringify(reads.slice(0, 200)));
    } catch {}
    return Promise.resolve({ data: { success: true } });
  }
  return api.post('/dashboard/news/read', { contentHash });
};

/** Wer hat die News gelesen (nur Admin) */
export const getNewsReaders = () => {
  if (USE_MOCK_API) {
    try {
      const reads = JSON.parse(localStorage.getItem(NEWS_READS_KEY) || '[]');
      return Promise.resolve({ data: { success: true, readers: reads } });
    } catch {
      return Promise.resolve({ data: { success: true, readers: [] } });
    }
  }
  return api.get('/dashboard/news/readers');
};

/** Alte Nachrichten mit Lesern (nur Admin) */
export const getNewsArchive = () => {
  if (USE_MOCK_API) {
    try {
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      const reads = JSON.parse(localStorage.getItem(NEWS_READS_KEY) || '[]');
      const currentContent = localStorage.getItem(STORAGE_KEY) || '';
      const simpleHash = (str) => {
        if (!str || !str.trim()) return '';
        let h = 0;
        for (let i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i) | 0;
        return String(h);
      };
      const currentHash = simpleHash(currentContent);
      const messages = history
        .filter((h, i) => {
          const c = (h.content || '').trim();
          return c && simpleHash(c) !== currentHash;
        })
        .map((h, i) => {
          const content = (h.content || '').trim();
          const hash = simpleHash(content);
          const msgReaders = reads.filter((r) => r.contentHash === hash);
          return {
            id: `mock-${i}-${h.createdAt || ''}`,
            content,
            createdAt: h.createdAt,
            updatedAt: h.updatedAt || null,
            updatedBy: h.updatedBy || null,
            readers: msgReaders.map((r) => ({ userName: r.userName, readAt: r.readAt }))
          };
        });
      return Promise.resolve({ data: { success: true, messages } });
    } catch {
      return Promise.resolve({ data: { success: true, messages: [] } });
    }
  }
  return api.get('/dashboard/news/archive');
};

/** Nachricht im Archiv bearbeiten (nur Admin) */
export const updateNewsArchiveEntry = (id, content, editorName = 'Administrator') => {
  if (USE_MOCK_API) {
    try {
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      const createdAt = String(id).replace(/^mock-\d+-/, '');
      const idx = history.findIndex((h) => String(h.createdAt || '') === createdAt);
      if (idx >= 0) {
        history[idx] = {
          ...history[idx],
          content: content || '',
          updatedAt: new Date().toISOString(),
          updatedBy: editorName || 'Administrator'
        };
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      }
    } catch {}
    return Promise.resolve({ data: { success: true } });
  }
  return api.put(`/dashboard/news/archive/${id}`, { content });
};

/** Nachricht aus Archiv löschen (nur Admin) */
export const deleteNewsArchiveEntry = (id) => {
  if (USE_MOCK_API) {
    try {
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      const filtered = history.filter((h, i) => String(id) !== `mock-${i}-${h.createdAt || ''}`);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
    } catch {}
    return Promise.resolve({ data: { success: true } });
  }
  return api.delete(`/dashboard/news/archive/${id}`);
};

export const saveDashboardNote = (content) => {
  if (USE_MOCK_API) {
    return mockSaveNote(content);
  }
  return api.put('/dashboard/note', { content });
};

export const getDashboardNoteHistory = (limit = 50) => {
  if (USE_MOCK_API) {
    return mockGetHistory();
  }
  return api.get('/dashboard/note/history', { params: { limit } });
};

const PERFORMANCE_STORAGE_KEY = 'dashboard-performance-metrics';

const mockGetPerformanceMetrics = async () => {
  try {
    const stored = localStorage.getItem(PERFORMANCE_STORAGE_KEY);
    const metrics = stored ? JSON.parse(stored) : null;
    return { data: { success: true, metrics } };
  } catch {
    return { data: { success: true, metrics: null } };
  }
};

const mockSavePerformanceMetrics = async (metrics) => {
  localStorage.setItem(PERFORMANCE_STORAGE_KEY, JSON.stringify(metrics));
  return { data: { success: true, message: 'Kennzahlen gespeichert' } };
};

/** Performance-Kennzahlen (Monatsziel, Quartalsziel) – für alle lesbar, Admin kann bearbeiten */
export const getPerformanceMetrics = () => {
  if (USE_MOCK_API) {
    return mockGetPerformanceMetrics();
  }
  return api.get('/dashboard/performance');
};

export const savePerformanceMetrics = (metrics) => {
  if (USE_MOCK_API) {
    return mockSavePerformanceMetrics(metrics);
  }
  return api.put('/dashboard/performance', { metrics });
};

const SITE_NEWS_MOCK_KEY = 'dashboard-site-news-mock';

/** NEWS für die Startseite (alle eingeloggten Benutzer) */
export const getSiteNews = () => {
  if (USE_MOCK_API) {
    try {
      const raw = localStorage.getItem(SITE_NEWS_MOCK_KEY);
      const data = raw ? JSON.parse(raw) : { content: '', updatedAt: null };
      return Promise.resolve({ data: { success: true, content: data.content ?? '', updatedAt: data.updatedAt ?? null } });
    } catch {
      return Promise.resolve({ data: { success: true, content: '', updatedAt: null } });
    }
  }
  return api.get('/dashboard/site-news');
};

export const saveSiteNews = (content) => {
  if (USE_MOCK_API) {
    try {
      const raw = localStorage.getItem(SITE_NEWS_MOCK_KEY);
      const data = raw ? JSON.parse(raw) : { content: '', updatedAt: null, history: [] };
      const prevContent = typeof data.content === 'string' ? data.content : '';
      const prevAt = data.updatedAt ?? null;
      const newContent = typeof content === 'string' ? content : '';
      if (prevContent.trim() && prevContent !== newContent) {
        const history = Array.isArray(data.history) ? [...data.history] : [];
        history.unshift({
          id: `sn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          content: prevContent,
          updatedAt: prevAt || new Date().toISOString()
        });
        data.history = history.slice(0, 100);
      }
      data.content = newContent;
      data.updatedAt = new Date().toISOString();
      localStorage.setItem(SITE_NEWS_MOCK_KEY, JSON.stringify(data));
      return Promise.resolve({
        data: { success: true, message: 'NEWS gespeichert (lokal)', updatedAt: data.updatedAt }
      });
    } catch {
      const payload = { content: content || '', updatedAt: new Date().toISOString(), history: [] };
      localStorage.setItem(SITE_NEWS_MOCK_KEY, JSON.stringify(payload));
      return Promise.resolve({
        data: { success: true, message: 'NEWS gespeichert (lokal)', updatedAt: payload.updatedAt }
      });
    }
  }
  return api.put('/dashboard/site-news', { content });
};

/** Frühere Startseiten-NEWS (nur Admin) */
export const getSiteNewsHistory = () => {
  if (USE_MOCK_API) {
    try {
      const raw = localStorage.getItem(SITE_NEWS_MOCK_KEY);
      const data = raw ? JSON.parse(raw) : {};
      return Promise.resolve({
        data: { success: true, entries: Array.isArray(data.history) ? data.history : [] }
      });
    } catch {
      return Promise.resolve({ data: { success: true, entries: [] } });
    }
  }
  return api.get('/dashboard/site-news/history');
};

export const updateSiteNewsHistoryEntry = (id, content) => {
  if (USE_MOCK_API) {
    try {
      const raw = localStorage.getItem(SITE_NEWS_MOCK_KEY);
      const data = raw ? JSON.parse(raw) : { content: '', updatedAt: null, history: [] };
      const history = Array.isArray(data.history) ? [...data.history] : [];
      const idx = history.findIndex((h) => h && h.id === id);
      if (idx === -1) {
        return Promise.reject(new Error('Eintrag nicht gefunden'));
      }
      history[idx] = {
        ...history[idx],
        content: typeof content === 'string' ? content : '',
        updatedAt: new Date().toISOString()
      };
      data.history = history;
      localStorage.setItem(SITE_NEWS_MOCK_KEY, JSON.stringify(data));
      return Promise.resolve({ data: { success: true, entry: history[idx] } });
    } catch (e) {
      return Promise.reject(e);
    }
  }
  return api.put(`/dashboard/site-news/history/${id}`, { content });
};

export const deleteSiteNewsHistoryEntry = (id) => {
  if (USE_MOCK_API) {
    try {
      const raw = localStorage.getItem(SITE_NEWS_MOCK_KEY);
      if (!raw) return Promise.resolve({ data: { success: true } });
      const data = JSON.parse(raw);
      const history = Array.isArray(data.history) ? data.history : [];
      data.history = history.filter((h) => h && h.id !== id);
      localStorage.setItem(SITE_NEWS_MOCK_KEY, JSON.stringify(data));
      return Promise.resolve({ data: { success: true } });
    } catch {
      return Promise.resolve({ data: { success: true } });
    }
  }
  return api.delete(`/dashboard/site-news/history/${id}`);
};

/** Bild oder PDF für NEWS-Editor hochladen (nur Admin, echte API) */
export const uploadNewsMedia = (file) => {
  if (USE_MOCK_API) {
    return Promise.reject(new Error('Medien-Upload im Mock-Modus nicht verfügbar. Bitte VITE_API_URL setzen.'));
  }
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/dashboard/news/upload', formData);
};
