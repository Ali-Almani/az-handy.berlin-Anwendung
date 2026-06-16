import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getExtraCopyRequestsApi, approveExtraCopyRequestApi, rejectExtraCopyRequestApi } from '../services/imeis.service';
import { isBüroMitarbeiter, isAdmin } from '../utils/roles';

const POLL_MS = 20000;

export function useExtraCopyRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!user?.id || (!isBüroMitarbeiter(user) && !isAdmin(user))) return;
    try {
      const res = await getExtraCopyRequestsApi();
      setRequests(res?.requests ?? []);
    } catch {
      setRequests([]);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || (!isBüroMitarbeiter(user) && !isAdmin(user))) return;

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

    if (!document.hidden) {
      startPolling();
    }

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, fetchRequests]);

  const approve = useCallback(async (id) => {
    setLoading(true);
    try {
      await approveExtraCopyRequestApi(id);
      setRequests((prev) => prev.filter((r) => String(r.id) !== String(id)));
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reject = useCallback(async (id) => {
    setLoading(true);
    try {
      await rejectExtraCopyRequestApi(id);
      setRequests((prev) => prev.filter((r) => String(r.id) !== String(id)));
    } catch (err) {
      throw err;
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
