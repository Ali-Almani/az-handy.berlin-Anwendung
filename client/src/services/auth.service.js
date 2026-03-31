import api from './api';
import mockApi from './mockApi.js';

// Wie api.js: In Produktion nie Mock – leeres VITE_API_URL bedeutet dort relatives /api.
const USE_MOCK_API = import.meta.env.PROD ? false : (
  import.meta.env.VITE_USE_MOCK_API === 'true' ||
  import.meta.env.VITE_API_URL === 'mock' ||
  !import.meta.env.VITE_API_URL
);

export const registerUser = (userData) => {
  if (USE_MOCK_API) {
    return mockApi.register(userData);
  }
  return api.post('/auth/register', userData);
};

export const loginUser = (credentials) => {
  if (USE_MOCK_API) {
    return mockApi.login(credentials);
  }
  return api.post('/auth/login', credentials);
};
