import { useEffect } from 'react';
import { loadImeisWithApi, getImeisDataFromApi, persistImeisState, shouldSkipSync, filterPendingHistoryRemovals, reconcilePendingHistoryRemovals } from '../../../services/imeis.service';
import { getSocket } from '../../../services/socket';
import { sortImeisOldestFirst, normalizeImeiSortKey } from '../utils/imeisSortUtils';
import { isOfficeImeiRole, dedupeCopyHistoryByImeiUser } from '../utils/copyHistoryRetention';
import { getProductFull } from '../utils/imeisProductUtils';

const POLL_INTERVAL_MS = 8000;
const POLL_INTERVAL_FAIL_MS = 20000;
const VERLAUF_REFRESH_MS = 3000;

function processCopyHistory(savedCopyHistory) {
  /** Eine Zeile pro IMEI und Mitarbeiter – Duplikate aus Sync/Reservieren zusammenfassen. */
  return dedupeCopyHistoryByImeiUser(savedCopyHistory ?? [])
    .map((entry) => {
      const a = entry.action;
      // Wichtig: Aktionen wie "reservieren"/"dereserviert" im Verlauf NICHT auf "checkout" normalisieren
      const action =
        a === 'abgelehnt' ? 'abgelehnt'
          : a === 'angenommen' ? 'angenommen'
            : a === 'reservieren' ? 'reservieren'
              : a === 'dereserviert' ? 'dereserviert'
                : a === 'checkout' ? 'checkout'
                  : 'checkout';
      return { ...entry, action };
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function enrichCopyHistoryProductsFromImeis(history, imeis) {
  const lookup = new Map();
  for (const item of Array.isArray(imeis) ? imeis : []) {
    const key = normalizeImeiSortKey(item?.imei);
    const product = getProductFull(item);
    if (key && product && product !== '-') lookup.set(key, product);
  }
  if (lookup.size === 0) return history;
  return (history || []).map((entry) => {
    const cur = String(entry?.product || '').trim();
    if (cur && cur !== '-') return entry;
    const key = normalizeImeiSortKey(entry?.imei);
    const product = key ? lookup.get(key) : '';
    return product ? { ...entry, product } : entry;
  });
}

function applyImeisData(data, setters, getManufacturer, isInitialLoad = false) {
  const {
    setImeis,
    setCellTextColors,
    setRowActions,
    setCopyHistory,
    setCopyTimestamps,
    setAvailableSheets,
    setActiveSheet,
    setAvailableManufacturers,
    setActiveManufacturer,
    setHistory,
    setSonderImeis
  } = setters;
  const storedImeis = sortImeisOldestFirst(data.imeis ?? []);
  setImeis(storedImeis);
  setCellTextColors(data.cellColors ?? {});
  setRowActions(data.rowActions ?? {});
  const processedHistory = enrichCopyHistoryProductsFromImeis(
    processCopyHistory(filterPendingHistoryRemovals(data.copyHistory ?? [])),
    storedImeis
  );
  reconcilePendingHistoryRemovals(data.copyHistory ?? []);
  setCopyHistory(processedHistory);
  setCopyTimestamps?.(data.copyTimestamps ?? []);

  if (typeof setSonderImeis === 'function') {
    setSonderImeis(Array.isArray(data.sonderImeis) ? data.sonderImeis : []);
  }

  const sheets = new Set();
  storedImeis.forEach((item) => {
    if (item.sheet) sheets.add(item.sheet);
  });
  const sheetsArray = Array.from(sheets);
  setAvailableSheets(sheetsArray);
  // Sheet-Tabs sind in der UI deaktiviert – kein Blatt-Filter, sonst verschwinden Zeilen nach
  // Excel-Upload, wenn bestehende IMEIs ein neues worksheet.sheet bekommen.
  setActiveSheet(null);

  const manufacturers = new Set();
  storedImeis.forEach(item => {
    const manufacturer = getManufacturer(item);
    if (manufacturer && manufacturer.trim() !== '') manufacturers.add(manufacturer.trim());
  });
  setAvailableManufacturers(Array.from(manufacturers).sort());
  if (isInitialLoad) {
    setActiveManufacturer(null);
    setHistory([]);
  }
}

/** Einheitlich nach PATCH /history-action oder manuell: Server-Zustand in React übernehmen */
export function applyImeisServerPayload(data, setters, getManufacturer, isInitialLoad = false) {
  applyImeisData(data, setters, getManufacturer, isInitialLoad);
}

export function useImeisData(
  getManufacturer,
  setImeis,
  setCellTextColors,
  setRowActions,
  setCopyHistory,
  setCopyTimestamps,
  setAvailableSheets,
  setActiveSheet,
  setAvailableManufacturers,
  setActiveManufacturer,
  setHistory,
  setLoading,
  user,
  showHistoryModal = false,
  setSonderImeis
) {
  useEffect(() => {
    const setters = {
      setImeis,
      setCellTextColors,
      setRowActions,
      setCopyHistory,
      setCopyTimestamps,
      setAvailableSheets,
      setActiveSheet,
      setAvailableManufacturers,
      setActiveManufacturer,
      setHistory,
      setSonderImeis
    };

    const loadImeisData = async () => {
      try {
        const data = await loadImeisWithApi(user);
        applyImeisData(data, setters, getManufacturer, true);
        if (!isOfficeImeiRole(user?.role)) {
          const processedHistory = processCopyHistory(data.copyHistory ?? []);
          if (processedHistory.length !== (data.copyHistory ?? []).length) {
            persistImeisState(user, { copyHistory: processedHistory });
          }
        }
      } catch (error) {
        console.error('Error loading IMEIs:', error);
      } finally {
        setLoading(false);
      }
    };
    loadImeisData();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const setters = {
      setImeis,
      setCellTextColors,
      setRowActions,
      setCopyHistory,
      setCopyTimestamps,
      setAvailableSheets,
      setActiveSheet,
      setAvailableManufacturers,
      setActiveManufacturer,
      setHistory,
      setSonderImeis
    };

    const socket = getSocket();
    let pollTimerId = null;

    const schedulePoll = (delayMs) => {
      if (socket?.connected) return;
      if (pollTimerId) clearTimeout(pollTimerId);
      pollTimerId = setTimeout(runPoll, delayMs);
    };

    const runPoll = async () => {
      if (socket?.connected) return;
      if (shouldSkipSync()) {
        schedulePoll(POLL_INTERVAL_MS);
        return;
      }
      try {
        const data = await getImeisDataFromApi();
        if (data) {
          applyImeisData(data, setters, getManufacturer, false);
          schedulePoll(POLL_INTERVAL_MS);
        } else {
          schedulePoll(POLL_INTERVAL_FAIL_MS);
        }
      } catch (_) {
        schedulePoll(POLL_INTERVAL_FAIL_MS);
      }
    };

    // Echtzeit: Sofort aktualisieren wenn Büro Excel hochlädt, alle löscht etc.

    // Fallback-Polling nur ohne Socket-Verbindung (Polling-Transport zählt als verbunden)
    if (!socket?.connected) {
      runPoll();
    }

    const onImeisUpdated = () => {
      if (shouldSkipSync()) return;
      getImeisDataFromApi().then((data) => {
        if (data) applyImeisData(data, setters, getManufacturer, false);
      });
    };
    const onExtraCopyDecision = (payload) => {
      const targetId = payload?.targetUserId ? String(payload.targetUserId) : null;
      const myId = user?.id != null ? String(user.id) : null;
      if (targetId && myId && targetId === myId) {
        onImeisUpdated();
      }
    };
    const onSocketConnect = () => {
      if (pollTimerId) {
        clearTimeout(pollTimerId);
        pollTimerId = null;
      }
      onImeisUpdated();
    };
    const onSocketDisconnect = () => {
      if (!pollTimerId) schedulePoll(POLL_INTERVAL_MS);
    };

    if (socket) {
      socket.on('imeis:updated', onImeisUpdated);
      socket.on('extraCopy:decision', onExtraCopyDecision);
      socket.on('connect', onSocketConnect);
      socket.on('disconnect', onSocketDisconnect);
      if (socket.connected) {
        onImeisUpdated();
      } else {
        socket.connect();
      }
    }

    // Fallback: Bei Tab-Wechsel neu laden (falls Socket-Event verpasst)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') onImeisUpdated();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (pollTimerId) clearTimeout(pollTimerId);
      if (socket) {
        socket.off('imeis:updated', onImeisUpdated);
        socket.off('extraCopy:decision', onExtraCopyDecision);
        socket.off('connect', onSocketConnect);
        socket.off('disconnect', onSocketDisconnect);
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!showHistoryModal || !user?.id) return;
    const setters = {
      setImeis,
      setCellTextColors,
      setRowActions,
      setCopyHistory,
      setCopyTimestamps,
      setAvailableSheets,
      setActiveSheet,
      setAvailableManufacturers,
      setActiveManufacturer,
      setHistory,
      setSonderImeis
    };

    const refreshVerlauf = async () => {
      if (shouldSkipSync()) return;
      try {
        const data = await getImeisDataFromApi();
        if (data) applyImeisData(data, setters, getManufacturer, false);
      } catch (_) {}
    };

    refreshVerlauf();
    const id = setInterval(refreshVerlauf, VERLAUF_REFRESH_MS);
    return () => clearInterval(id);
  }, [showHistoryModal, user?.id, setImeis, setCellTextColors, setRowActions, setCopyHistory, setCopyTimestamps, setAvailableSheets, setActiveSheet, setAvailableManufacturers, setActiveManufacturer, setHistory, setSonderImeis]);
}
