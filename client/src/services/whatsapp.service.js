import api from './api';

export const listWhatsAppTicketsApi = async () => {
  const res = await api.get('/whatsapp/tickets');
  return res.data;
};

export const sendWhatsAppTextApi = async (ticketId, text, authorName) => {
  const res = await api.post(`/whatsapp/tickets/${encodeURIComponent(ticketId)}/messages`, {
    text,
    authorName
  }, { timeout: 30000 });
  return res.data;
};

export const patchWhatsAppTicketApi = async (ticketId, patch) => {
  const res = await api.patch(`/whatsapp/tickets/${encodeURIComponent(ticketId)}`, patch);
  return res.data;
};

export const deleteWhatsAppTicketApi = async (ticketId) => {
  const res = await api.delete(`/whatsapp/tickets/${encodeURIComponent(ticketId)}`);
  return res.data;
};
