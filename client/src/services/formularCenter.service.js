import api from './api';
import { resolveApiBasePath } from '../utils/runtimeApiBase';

/** Download-URL inkl. API-Basis (Production: oft nur /api proxied, nicht /uploads). */
export function getFormularCenterDownloadHref(itemId) {
  const base = resolveApiBasePath().replace(/\/$/, '');
  return `${base}/formular-center/download/${encodeURIComponent(String(itemId || ''))}`;
}

export const getFormularCenterItems = () => api.get('/formular-center');

export const createFormularSection = ({ title }) => api.post('/formular-center/sections', { title });

export const updateFormularSectionTitle = (sectionId, { title }) =>
  api.patch(`/formular-center/sections/${encodeURIComponent(sectionId)}`, { title });

export const deleteFormularSection = (sectionId) =>
  api.delete(`/formular-center/sections/${encodeURIComponent(sectionId)}`);

export const moveFormularSection = (sectionId, direction) =>
  api.post(`/formular-center/sections/${encodeURIComponent(sectionId)}/move`, { direction });

export const moveFormularItem = (itemId, direction) =>
  api.post(`/formular-center/items/${encodeURIComponent(itemId)}/move`, { direction });

export const uploadFormularCenterFile = (file, sectionId) => {
  const formData = new FormData();
  formData.append('sectionId', String(sectionId));
  formData.append('file', file);
  return api.post('/formular-center/upload', formData);
};

/** @deprecated – nutze uploadFormularCenterFile */
export const uploadFormularCenterPdf = uploadFormularCenterFile;

export const deleteFormularCenterItem = (id) =>
  api.delete(`/formular-center/items/${encodeURIComponent(id)}`);

export const updateFormularCenterItemMeta = (id, { originalName }) =>
  api.patch(`/formular-center/items/${encodeURIComponent(id)}`, { originalName });

export const replaceFormularCenterFile = (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/formular-center/items/${encodeURIComponent(id)}/replace`, formData);
};
