import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getSocket } from '../services/socket';
import {
  getVoucherManualRequestsApi,
  approveVoucherManualRequestApi,
  rejectVoucherManualRequestApi
} from '../services/voucherManualRequest.service';
import { isBüroMitarbeiter, isAdmin } from '../utils/roles';

const POLL_MS = 20000;

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

    let intervalId = null;

    const startPolling = () => {
      fetchRequests();
      intervalId = setInterval(fetchRequests, POLL_MS);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        stopPolling();
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const socket = getSocket();
    const onUpd = () => fetchRequests();
    if (socket) socket.on('voucherManualRequests:updated', onUpd);

    if (!document.hidden) {
      startPolling();
    }

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
