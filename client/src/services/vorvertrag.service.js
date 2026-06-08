import api from './api';

export const listVorvertraegeApi = async () => {
  const res = await api.get('/vorvertrag');
  return res.data;
};

export const getVorvertragApi = async (id) => {
  const res = await api.get(`/vorvertrag/${encodeURIComponent(id)}`);
  return res.data;
};

export const createVorvertragApi = async (payload) => {
  const res = await api.post('/vorvertrag', payload);
  return res.data;
};

export const updateVorvertragApi = async (id, payload) => {
  const res = await api.patch(`/vorvertrag/${encodeURIComponent(id)}`, payload);
  return res.data;
};

export const deleteVorvertragApi = async (id) => {
  const res = await api.delete(`/vorvertrag/${encodeURIComponent(id)}`);
  return res.data;
};
