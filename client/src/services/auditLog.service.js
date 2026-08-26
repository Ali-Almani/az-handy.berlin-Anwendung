import api from './api';

export const listAuditLogsApi = async (params = {}) => {
  const res = await api.get('/audit-logs', { params });
  return res.data;
};

export const exportAuditLogsApi = async (params = {}) => {
  const res = await api.get('/audit-logs/export', {
    params,
    responseType: 'blob'
  });
  return res.data;
};

export const getAuditCriticalNotificationsApi = async () => {
  const res = await api.get('/audit-logs/notifications');
  return res.data;
};

export const markAuditCriticalNotificationReadApi = async (id) => {
  const res = await api.patch(`/audit-logs/notifications/${id}/read`);
  return res.data;
};

export const markAllAuditCriticalNotificationsReadApi = async () => {
  const res = await api.patch('/audit-logs/notifications/all/read');
  return res.data;
};
