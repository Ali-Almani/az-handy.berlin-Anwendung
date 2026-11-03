import api from './api';

export const listWhatsAppTicketsApi = async () => {
  const res = await api.get('/whatsapp/tickets');
  return res.data;
};

export const sendWhatsAppMessageApi = async (ticketId, { text, images, voices, authorName } = {}) => {
  const res = await api.post(`/whatsapp/tickets/${encodeURIComponent(ticketId)}/messages`, {
    text,
    images,
    voices,
    authorName
  }, { timeout: 60000 });
  return res.data;
};

export const sendWhatsAppTextApi = async (ticketId, text, authorName) => (
  sendWhatsAppMessageApi(ticketId, { text, authorName })
);

export const patchWhatsAppTicketApi = async (ticketId, patch) => {
  const res = await api.patch(`/whatsapp/tickets/${encodeURIComponent(ticketId)}`, patch);
  return res.data;
};

export const deleteWhatsAppTicketApi = async (ticketId) => {
  const res = await api.delete(`/whatsapp/tickets/${encodeURIComponent(ticketId)}`);
  return res.data;
};

export const deleteWhatsAppMessageApi = async (ticketId, messageId) => {
  const res = await api.delete(
    `/whatsapp/tickets/${encodeURIComponent(ticketId)}/messages/${encodeURIComponent(messageId)}`
  );
  return res.data;
};
