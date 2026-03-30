import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getSocket } from '../services/socket';
import {
  getVoucherManualRequestsApi,
  approveVoucherManualRequestApi,
  rejectVoucherManualRequestApi
} from '../services/voucherManualRequest.service';
import { isBüroMitarbeiter, isAdmin } from '../utils/roles';

const POLL_MS = 4000;

export function useVoucherManualRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const canSee = user?.id && (isBüroMitarbeiter(user) || isAdmin(user));

  const fetchRequests = useCallback(async () => {
    if (!canSee) return;
    try {
      const res = await getVoucherManualRequestsApi();
      setRequests(res?.requests ?? []);
    } catch {
      setRequests([]);
    }
  }, [canSee]);

  useEffect(() => {
    if (!canSee) return;
    fetchRequests();
    const id = setInterval(fetchRequests, POLL_MS);
    const socket = getSocket();
    const onUpd = () => fetchRequests();
    if (socket) socket.on('voucherManualRequests:updated', onUpd);
    return () => {
      clearInterval(id);
      if (socket) socket.off('voucherManualRequests:updated', onUpd);
    };
  }, [canSee, fetchRequests]);

  const approve = useCallback(async (id) => {
    setLoading(true);
    try {
      await approveVoucherManualRequestApi(id);
      setRequests((prev) => prev.filter((r) => String(r.id) !== String(id)));
    } finally {
      setLoading(false);
    }
  }, []);

  const reject = useCallback(async (id) => {
    setLoading(true);
    try {
      await rejectVoucherManualRequestApi(id);
      setRequests((prev) => prev.filter((r) => String(r.id) !== String(id)));
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    requests,
    hasPendingRequests: requests.length > 0,
    requestCount: requests.length,
    loading,
    approve,
    reject,
    refresh: fetchRequests
  };
}
