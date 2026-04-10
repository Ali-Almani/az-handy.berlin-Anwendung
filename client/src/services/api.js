import axios from 'axios';
import mockApi from './mockApi.js';
import { resolveApiBasePath } from '../utils/runtimeApiBase.js';

// In Produktion: Immer echte API (nie Mock), damit IMEI-Daten für alle Benutzer sichtbar sind
const USE_MOCK_API = import.meta.env.PROD ? false : (
  import.meta.env.VITE_USE_MOCK_API === 'true' ||
  import.meta.env.VITE_API_URL === 'mock' ||
  !import.meta.env.VITE_API_URL
);

const API_BASE = resolveApiBasePath();

function voucherRowsMatchMock(a, b) {
  if (String(a.sheet || 'default') !== String(b.sheet || 'default')) return false;
  if (Number(a.row) !== Number(b.row)) return false;
  try {
    return JSON.stringify(a.rowData || {}) === JSON.stringify(b.rowData || {});
  } catch {
    return false;
  }
}

const createMockApi = () => {
  let voucherMockUserState = { copyHistory: [], copyTimestamps: [], rowActions: {} };
  let voucherMockRows = [];
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
      if (url === '/excel/voucher-remove-row') {
        const payload = data?.row ?? data;
        const idx = voucherMockRows.findIndex((r) => voucherRowsMatchMock(r, payload));
        if (idx === -1) {
          const err = new Error('Zeile nicht gefunden');
          err.response = { status: 404, data: { success: false } };
          throw err;
        }
        voucherMockRows.splice(idx, 1);
        return { data: { success: true, count: voucherMockRows.length } };
      }
      if (url === '/excel/voucher-restore-row') {
        const payload = data?.row ?? data;
        if (voucherMockRows.some((r) => voucherRowsMatchMock(r, payload))) {
          return { data: { success: true, duplicate: true, count: voucherMockRows.length } };
        }
        voucherMockRows.push(JSON.parse(JSON.stringify(payload)));
        return { data: { success: true, count: voucherMockRows.length } };
      }
      if (url === '/formular-center/upload') {
        return {
          data: {
            success: true,
            item: {
              id: 'mock-fc',
              originalName: 'beispiel.pdf',
              uploadedAt: new Date().toISOString(),
              uploadedByName: 'Mock',
              url: '#'
            }
          }
        };
      }
      if (url?.match(/^\/formular-center\/[^/]+\/replace$/)) {
        return {
          data: {
            success: true,
            item: {
              id: 'mock-fc',
              originalName: 'ersetzt.xlsx',
              uploadedAt: new Date().toISOString(),
              uploadedByName: 'Mock',
              url: '#'
            }
          }
        };
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
      if (url === '/excel/vouchers') {
        return {
          data: {
            success: true,
            uploaded: [...voucherMockRows],
            updatedAt: null,
            userState: {
              copyHistory: [...voucherMockUserState.copyHistory],
              copyTimestamps: [...voucherMockUserState.copyTimestamps],
              rowActions: { ...voucherMockUserState.rowActions }
            }
          }
        };
      }
      if (url === '/formular-center') {
        return { data: { success: true, items: [] } };
      }
      throw new Error(`Mock API: Route ${url} not implemented`);
    },
    put: async (url, data) => {
      if (url === '/users/profile') {
        const token = localStorage.getItem('token');
        return await mockApi.updateProfile(token, data);
      }
      if (url === '/users/password') {
        const token = localStorage.getItem('token');
        return await mockApi.updatePassword(token, data);
      }
      if (url === '/imeis/data') {
        return await mockApi.saveImeisData(data);
      }
      if (url === '/excel/voucher-user-state') {
        voucherMockUserState = {
          copyHistory: Array.isArray(data?.copyHistory) ? data.copyHistory : [],
          copyTimestamps: Array.isArray(data?.copyTimestamps) ? data.copyTimestamps : [],
          rowActions: data?.rowActions && typeof data.rowActions === 'object' ? data.rowActions : {}
        };
        return { data: { success: true } };
      }
      throw new Error(`Mock API: Route ${url} not implemented`);
    },
    patch: async (url, data) => {
      if (url === '/excel/voucher-history-action') {
        const { userName, nummer, timestamp } = data || {};
        voucherMockUserState.copyHistory = (voucherMockUserState.copyHistory || []).filter(
          (e) =>
            !(
              e &&
              String(e.userName || '').trim() === String(userName || '').trim() &&
              String(e.nummer || '') === String(nummer ?? '') &&
              String(e.timestamp || '') === String(timestamp || '')
            )
        );
        return { data: { success: true } };
      }
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
      if (url?.match(/^\/formular-center\/[^/]+$/) && !url.includes('/download/')) {
        return {
          data: {
            success: true,
            item: {
              id: url.replace('/formular-center/', ''),
              originalName: data?.originalName || '',
              uploadedAt: new Date().toISOString(),
              uploadedByName: 'Mock',
              url: '#'
            }
          }
        };
      }
      throw new Error(`Mock API: Route ${url} not implemented`);
    },
    delete: async (url) => {
      if (url?.startsWith('/formular-center/')) {
        return { data: { success: true } };
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
      // FormData braucht multipart boundary – kein application/json
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
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
      const status = error.response?.status;
      const msg = String(error.response?.data?.message || '');
      // Backend kann je nach Version 401 oder 403 für abgelaufene Tokens liefern.
      if (status === 401 || (status === 403 && msg.toLowerCase().includes('expired token'))) {
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

export const uploadExcelFile = async (file, options = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  if (options.saveDirectly) formData.append('saveDirectly', 'true');

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

export const uploadVoucherExcelFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('token');
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (USE_MOCK_API) {
    throw new Error('Voucher-Excel-Upload im Mock-Modus nicht verfügbar. Bitte verwenden Sie den echten API-Modus.');
  }

  const response = await axios.post(`${API_BASE || '/api'}/excel/voucher-upload`, formData, {
    headers: {
      ...headers,
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
};

export const getVouchersApi = async () => {
  const res = await api.get('/excel/vouchers');
  return res.data;
};

export const putVoucherUserStateApi = async (payload) => {
  const res = await api.put('/excel/voucher-user-state', payload);
  return res.data;
};

export const removeVoucherListRowApi = async (row, options = {}) => {
  const { allowMissing = false } = options;
  try {
    const res = await api.post('/excel/voucher-remove-row', { row });
    return res.data;
  } catch (e) {
    if (allowMissing && e.response?.status === 404) {
      return { success: true, alreadyGone: true };
    }
    throw e;
  }
};

export const restoreVoucherListRowApi = async (row) => {
  const res = await api.post('/excel/voucher-restore-row', { row });
  return res.data;
};

/** Büro / Admin / Teamleiter: Verlauf-Aktion für den genannten Benutzer (targetUserName) */
export const updateVoucherHistoryActionApi = async (payload) => {
  const res = await api.patch('/excel/voucher-history-action', payload);
  return res.data;
};

if (USE_MOCK_API) {
  console.log('🔧 Mock API Modus aktiviert - Kein Backend-Server erforderlich!');
  console.log('📝 Test-Login-Daten:');
  console.log('   Admin: admin@az-handy.berlin / Admin123!');
  console.log('   Büro (Erinnerung senden): m.somer@az-handy.berlin / !azHandy.berlin20260203?');
  console.log('   Benutzer (Aktion wählen): test@example.com / test123');
}

export default api;
