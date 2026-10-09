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

export const updateVorvertragTicketStatusApi = async (id, ticketStatus) => {
  const res = await api.patch(`/vorvertrag/${encodeURIComponent(id)}/status`, { ticketStatus });
  return res.data;
};

export const deleteVorvertragApi = async (id) => {
  const res = await api.delete(`/vorvertrag/${encodeURIComponent(id)}`);
  return res.data;
};

export const getInboxAnweisungApi = async () => {
  const res = await api.get('/vorvertrag/anweisung');
  return res.data;
};

export const saveInboxAnweisungApi = async (text, { notify = false } = {}) => {
  const res = await api.put('/vorvertrag/anweisung', {
    text: String(text ?? ''),
    notify: Boolean(notify)
  });
  return res.data;
};

export const markInboxAnweisungReadApi = async () => {
  const res = await api.post('/vorvertrag/anweisung/read');
  return res.data;
};
