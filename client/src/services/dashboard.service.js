import api from './api';

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

const mockSaveNote = async (content) => {
  localStorage.setItem(STORAGE_KEY, content || '');
  localStorage.setItem(`${STORAGE_KEY}-updated`, new Date().toISOString());
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  history.unshift({ content: content || '', createdAt: new Date().toISOString() });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
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
export const getNews = () => {
  if (USE_MOCK_API) {
    return mockGetNote();
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
