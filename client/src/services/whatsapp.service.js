import api from './api';

export const listWhatsAppTicketsApi = async () => {
  const res = await api.get('/whatsapp/tickets');
  return res.data;
};

export const sendWhatsAppMessageApi = async (ticketId, { text, images, voices, files, authorName } = {}) => {
  const res = await api.post(`/whatsapp/tickets/${encodeURIComponent(ticketId)}/messages`, {
    text,
    images,
    voices,
    files,
    authorName
  }, { timeout: 120000 });
  return res.data;
};

export const sendWhatsAppMediaFileApi = async (ticketId, { file, text, authorName, kind } = {}) => {
  const form = new FormData();
  form.append('file', file);
  form.append('text', text || '');
  form.append('authorName', authorName || '');
  form.append('kind', kind || '');
  const res = await api.post(
    `/whatsapp/tickets/${encodeURIComponent(ticketId)}/media`,
    form,
    { timeout: 300000 }
  );
  return res.data;
};

export const sendWhatsAppTextApi = async (ticketId, text, authorName) => (
  sendWhatsAppMessageApi(ticketId, { text, authorName })
);

export const uploadTicketDocumentApi = async (ticketId, { file, uploadedBy } = {}) => {
  const form = new FormData();
  form.append('file', file);
  form.append('uploadedBy', uploadedBy || '');
  const res = await api.post(
    `/whatsapp/tickets/${encodeURIComponent(ticketId)}/documents`,
    form,
    { timeout: 120000 }
  );
  return res.data;
};

export const deleteTicketDocumentApi = async (ticketId, { src, id } = {}) => {
  const res = await api.post(
    `/whatsapp/tickets/${encodeURIComponent(ticketId)}/documents/delete`,
    { src: src || '', id: id || '' }
  );
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

export const deleteWhatsAppMessageApi = async (ticketId, messageId) => {
  const res = await api.post(`/whatsapp/tickets/${encodeURIComponent(ticketId)}/messages/delete`, {
    messageId
  });
  return res.data;
};

export const getAutoQuestionFlowApi = async () => {
  const res = await api.get('/whatsapp/auto-flow');
  return res.data;
};

export const saveAutoQuestionFlowApi = async (flow) => {
  const res = await api.put('/whatsapp/auto-flow', { flow });
  return res.data;
};

export const getInboxGroupsApi = async () => {
  const res = await api.get('/whatsapp/inbox-groups');
  return res.data;
};

export const saveInboxGroupsApi = async (payload) => {
  const res = await api.put('/whatsapp/inbox-groups', payload);
  return res.data;
};
