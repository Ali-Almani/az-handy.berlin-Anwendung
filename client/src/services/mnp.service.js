import api from './api';

export const listMnpEntriesApi = async () => {
  const res = await api.get('/mnp');
  return res.data;
};

export const getMnpEntryApi = async (id) => {
  const res = await api.get(`/mnp/${encodeURIComponent(id)}`);
  return res.data;
};

export const createMnpEntryApi = async (payload) => {
  const res = await api.post('/mnp', payload);
  return res.data;
};

export const updateMnpEntryApi = async (id, payload) => {
  const res = await api.patch(`/mnp/${encodeURIComponent(id)}`, payload);
  return res.data;
};

export const deleteMnpEntryApi = async (id) => {
  const res = await api.delete(`/mnp/${encodeURIComponent(id)}`);
  return res.data;
};
