import { useEffect } from 'react';
import { loadImeisWithApi, getImeisDataFromApi, persistImeisState, shouldSkipSync } from '../../../services/imeis.service';
import { getSocket } from '../../../services/socket';
import { sortImeisOldestFirst } from '../utils/imeisSortUtils';

const POLL_INTERVAL_MS = 1500;
const VERLAUF_REFRESH_MS = 1000;

function processCopyHistory(savedCopyHistory) {
  /** Dedup robust: IMEI+Benutzer+Aktion (Timestamp kann minimal abweichen durch Sync/Synthese) */
  const uniqueHistoryMap = new Map();
  (savedCopyHistory ?? []).forEach((entry) => {
    const imei = String(entry?.imei || '').trim();
    const userName = String(entry?.userName || '').trim();
    const action = String(entry?.action || '').trim();
    const key = `${imei}|${userName}|${action}`;
    const existingEntry = uniqueHistoryMap.get(key);
    if (!existingEntry || new Date(entry.timestamp || 0) > new Date(existingEntry.timestamp || 0)) {
      uniqueHistoryMap.set(key, entry);
    }
  });
  return Array.from(uniqueHistoryMap.values())
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
  const processedHistory = processCopyHistory(data.copyHistory ?? []);
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
  if (isInitialLoad || sheetsArray.length === 0) {
    setActiveSheet(sheetsArray.length > 0 ? sheetsArray[0] : null);
  }

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
        const processedHistory = processCopyHistory(data.copyHistory ?? []);
        if (processedHistory.length !== (data.copyHistory ?? []).length) {
          persistImeisState(user, { copyHistory: processedHistory });
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

    const syncFromServer = async () => {
      if (shouldSkipSync()) return;
      try {
        const data = await getImeisDataFromApi();
        if (data) {
          applyImeisData(data, setters, getManufacturer, false);
        }
      } catch (err) {
        // Silent - avoid console spam
      }
    };

    // Echtzeit: Sofort aktualisieren wenn Büro Excel hochlädt, alle löscht etc.
    const socket = getSocket();
    const hasSocket = Boolean(socket);
    const socketIsRealtime =
      hasSocket && (socket.connected || socket.io?.engine?.transport?.name === 'websocket');

    // Fallback-Polling: nur wenn kein Socket verfügbar ist (oder noch nicht verbunden)
    syncFromServer();
    const intervalId = socketIsRealtime ? null : setInterval(syncFromServer, POLL_INTERVAL_MS);

    const onImeisUpdated = () => {
      getImeisDataFromApi().then((data) => {
        if (data) applyImeisData(data, setters, getManufacturer, false);
      });
    };
    if (socket) {
      socket.on('imeis:updated', onImeisUpdated);
      // Wenn Socket sich (re)verbindet, sofort einmal refreshen (verhindert 1–2s Poll-Lag)
      socket.on('connect', onImeisUpdated);
      if (!socket.connected) socket.connect();
    }

    // Fallback: Bei Tab-Wechsel neu laden (falls Socket-Event verpasst)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncFromServer();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (socket) {
        socket.off('imeis:updated', onImeisUpdated);
        socket.off('connect', onImeisUpdated);
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
