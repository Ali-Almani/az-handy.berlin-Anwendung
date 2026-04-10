import api from './api';
import { resolveApiBasePath } from '../utils/runtimeApiBase';

/** Download-URL inkl. API-Basis (Production: oft nur /api proxied, nicht /uploads). */
export function getFormularCenterDownloadHref(itemId) {
  const base = resolveApiBasePath().replace(/\/$/, '');
  return `${base}/formular-center/download/${encodeURIComponent(String(itemId || ''))}`;
}

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
