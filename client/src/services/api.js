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
  console.log('   Email: admin@az-handy.berlin');
  console.log('   Password: Admin123!');
}

export default api;
