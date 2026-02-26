import api from './api';
import mockApi from './mockApi.js';

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true' || 
                     import.meta.env.VITE_API_URL === 'mock' ||
                     !import.meta.env.VITE_API_URL;

export const getUserProfile = () => {
  if (USE_MOCK_API) {
    const token = localStorage.getItem('token');
    return mockApi.getProfile(token);
  }
  return api.get('/users/profile');
};

export const updateUserProfile = (userData) => {
  if (USE_MOCK_API) {
    const token = localStorage.getItem('token');
    return mockApi.updateProfile(token, userData);
  }
  return api.put('/users/profile', userData);
};

export const updatePassword = (passwordData) => {
  if (USE_MOCK_API) {
    const token = localStorage.getItem('token');
    return mockApi.updatePassword(token, passwordData);
  }
  return api.put('/users/password', passwordData);
};

export const createUser = (userData) => {
  if (USE_MOCK_API) {
    const token = localStorage.getItem('token');
    return mockApi.createUserByAdmin(token, userData);
  }
  return api.post('/users', userData);
};

export const getAllUsers = () => {
  if (USE_MOCK_API) {
    const token = localStorage.getItem('token');
    return mockApi.getAllUsers(token);
  }
  return api.get('/users');
};

export const deleteUser = (userId) => {
  if (USE_MOCK_API) {
    const token = localStorage.getItem('token');
    return mockApi.deleteUser(token, userId);
  }
  return api.delete(`/users/${userId}`);
};
