import api from './api';
import mockApi from './mockApi.js';

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true' || 
                     import.meta.env.VITE_API_URL === 'mock' ||
                     !import.meta.env.VITE_API_URL;

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
