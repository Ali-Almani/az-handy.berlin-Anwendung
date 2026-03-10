import axios from 'axios';
import mockApi from './mockApi.js';

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true' || 
                     import.meta.env.VITE_API_URL === 'mock' ||
                     !import.meta.env.VITE_API_URL;

// In Dev: Nutze Proxy (leerer baseURL = gleicher Origin, Proxy leitet /api weiter)
// In Prod: Volle API-URL
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'http://localhost:5000/api');
// Stelle sicher, dass baseURL immer auf /api endet (Pfade wie /users/... werden angehängt)
const API_BASE = !API_URL ? '/api' : (API_URL.endsWith('/api') ? API_URL : `${API_URL.replace(/\/$/, '')}/api`);

const createMockApi = () => {
  return {
    post: async (url, data) => {
      if (url === '/auth/login') {
        return await mockApi.login(data);
      } else if (url === '/auth/register') {
        return await mockApi.register(data);
      }
      if (url === '/imeis/reminder') {
        const token = localStorage.getItem('token');
        return await mockApi.sendReminder(token, data);
      }
      if (url === '/imeis/reminder-response') {
        const token = localStorage.getItem('token');
        return await mockApi.notifyReminderResponse(token, data);
      }
      if (url === '/imeis/extra-copy-request') {
        return { data: { success: true, message: 'Anfrage an Büro gesendet', id: 1 } };
      }
      if (url?.match(/^\/imeis\/extra-copy-request\/\d+\/approve$/)) {
        return { data: { success: true, message: 'Extra-Kopie genehmigt' } };
      }
      if (url?.match(/^\/imeis\/extra-copy-request\/\d+\/reject$/)) {
        return { data: { success: true, message: 'Anfrage abgelehnt' } };
      }
      throw new Error(`Mock API: Route ${url} not implemented`);
    },
    get: async (url) => {
      if (url === '/users/profile') {
        const token = localStorage.getItem('token');
        return await mockApi.getProfile(token);
      }
      if (url === '/imeis/data') {
        return await mockApi.getImeisData();
      }
      if (url === '/imeis/reminders') {
        const token = localStorage.getItem('token');
        return await mockApi.getMyReminders(token);
      }
      if (url === '/imeis/extra-copy-requests') {
        return { data: { success: true, requests: [] } };
      }
      if (url === '/imeis/reminder-response-notifications') {
        const token = localStorage.getItem('token');
        return await mockApi.getReminderResponseNotifications(token);
      }
      if (url === '/imeis/extra-copy-notifications') {
        return { data: { success: true, notifications: [] } };
      }
      throw new Error(`Mock API: Route ${url} not implemented`);
    },
    put: async (url, data) => {
      if (url === '/users/profile') {
        const token = localStorage.getItem('token');
        return await mockApi.updateProfile(token, data);
      }
      if (url === '/imeis/data') {
        return await mockApi.saveImeisData(data);
      }
      throw new Error(`Mock API: Route ${url} not implemented`);
    },
    patch: async (url, data) => {
      if (url === '/imeis/data/history-action' || url === 'imeis/data/history-action') {
        return await mockApi.updateHistoryAction(data);
      }
      if (url?.startsWith('/imeis/reminders/') && url?.endsWith('/read')) {
        const token = localStorage.getItem('token');
        const id = url.replace('/imeis/reminders/', '').replace('/read', '');
        return await mockApi.markReminderRead(token, id);
      }
      if (url?.match(/^\/imeis\/extra-copy-notifications\/\d+\/read$/)) {
        return { data: { success: true, message: 'Als gelesen markiert' } };
      }
      if (url?.match(/^\/imeis\/reminder-response-notifications\/.+\/read$/)) {
        const token = localStorage.getItem('token');
        const id = url.replace('/imeis/reminder-response-notifications/', '').replace('/read', '');
        return await mockApi.markReminderResponseNotificationRead(token, id);
      }
      throw new Error(`Mock API: Route ${url} not implemented`);
    }
  };
};

const createRealApi = () => {
  const api = axios.create({
    baseURL: API_BASE,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('loginTimestamp');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return api;
};

const api = USE_MOCK_API ? createMockApi() : createRealApi();

export const uploadExcelFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('token');
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (USE_MOCK_API) {
    throw new Error('Excel-Upload im Mock-Modus nicht verfügbar. Bitte verwenden Sie den echten API-Modus.');
  }

  const response = await axios.post(`${API_BASE || '/api'}/excel/upload`, formData, {
    headers: {
      ...headers,
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
};

if (USE_MOCK_API) {
  console.log('🔧 Mock API Modus aktiviert - Kein Backend-Server erforderlich!');
  console.log('📝 Test-Login-Daten:');
  console.log('   Admin: admin@az-handy.berlin / Admin123!');
  console.log('   Büro (Erinnerung senden): m.somer@az-handy.berlin / !azHandy.berlin20260203?');
  console.log('   Benutzer (Aktion wählen): test@example.com / test123');
}

export default api;
