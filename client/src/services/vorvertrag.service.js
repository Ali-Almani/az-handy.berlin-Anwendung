import api from './api';

export const listVorvertraegeApi = () => api.get('/vorvertrag');

export const getVorvertragApi = (id) => api.get(`/vorvertrag/${encodeURIComponent(id)}`);

export const createVorvertragApi = (payload) => api.post('/vorvertrag', payload);

export const updateVorvertragApi = (id, payload) =>
  api.patch(`/vorvertrag/${encodeURIComponent(id)}`, payload);

export const deleteVorvertragApi = (id) => api.delete(`/vorvertrag/${encodeURIComponent(id)}`);
