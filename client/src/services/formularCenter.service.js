import api from './api';

export const getFormularCenterItems = () => api.get('/formular-center');

export const uploadFormularCenterPdf = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/formular-center/upload', formData);
};

export const deleteFormularCenterItem = (id) =>
  api.delete(`/formular-center/${encodeURIComponent(id)}`);
