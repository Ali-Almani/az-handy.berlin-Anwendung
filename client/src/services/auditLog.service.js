import api from './api';

export const listAuditLogsApi = async (params = {}) => {
  const res = await api.get('/audit-logs', { params });
  return res.data;
};
