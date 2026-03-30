import api from './api';

export const createVoucherManualRequestApi = async (payload) => {
  const res = await api.post('/excel/voucher-manual-request', payload);
  return res.data;
};

export const getVoucherManualRequestsApi = async () => {
  const res = await api.get('/excel/voucher-manual-requests');
  return res.data;
};

export const approveVoucherManualRequestApi = async (id) => {
  const res = await api.post(`/excel/voucher-manual-request/${id}/approve`);
  return res.data;
};

export const rejectVoucherManualRequestApi = async (id) => {
  const res = await api.post(`/excel/voucher-manual-request/${id}/reject`);
  return res.data;
};
