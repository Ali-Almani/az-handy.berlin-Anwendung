import api from './api';

export const getFormularCenterItems = () => api.get('/formular-center');

export const uploadFormularCenterFile = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/formular-center/upload', formData);
};

/** @deprecated – nutze uploadFormularCenterFile */
export const uploadFormularCenterPdf = uploadFormularCenterFile;

export const deleteFormularCenterItem = (id) =>
  api.delete(`/formular-center/${encodeURIComponent(id)}`);
