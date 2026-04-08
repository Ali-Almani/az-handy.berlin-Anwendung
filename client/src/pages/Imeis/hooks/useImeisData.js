import { useEffect } from 'react';
import { loadImeisWithApi, getImeisDataFromApi, persistImeisState, shouldSkipSync } from '../../../services/imeis.service';
import { getSocket } from '../../../services/socket';

const POLL_INTERVAL_MS = 1500;
const VERLAUF_REFRESH_MS = 1000;

function processCopyHistory(savedCopyHistory) {
  /** Pro Eintrag (IMEI+Benutzer+Zeit), nicht nur pro IMEI – sonst „klebt“ der Verlauf nach Büro-Aktion */
  const uniqueHistoryMap = new Map();
  (savedCopyHistory ?? []).forEach((entry) => {
    const imei = String(entry?.imei || '').trim();
    const userName = String(entry?.userName || '').trim();
    const ts = entry?.timestamp ? String(entry.timestamp) : '';
    const key = `${imei}|${userName}|${ts}`;
    const existingEntry = uniqueHistoryMap.get(key);
    if (!existingEntry || new Date(entry.timestamp || 0) > new Date(existingEntry.timestamp || 0)) {
      uniqueHistoryMap.set(key, entry);
    }
  });
  return Array.from(uniqueHistoryMap.values())
    .map((entry) => {
      const a = entry.action;
      const action =
        a === 'abgelehnt' ? 'abgelehnt' : a === 'angenommen' ? 'angenommen' : 'checkout';
      return { ...entry, action };
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function applyImeisData(data, setters, getManufacturer, isInitialLoad = false) {
  const { setImeis, setCellTextColors, setRowActions, setCopyHistory, setCopyTimestamps, setAvailableSheets, setActiveSheet, setAvailableManufacturers, setActiveManufacturer, setHistory } = setters;
  const storedImeis = data.imeis ?? [];
  setImeis(storedImeis);
  setCellTextColors(data.cellColors ?? {});
  setRowActions(data.rowActions ?? {});
  const processedHistory = processCopyHistory(data.copyHistory ?? []);
  setCopyHistory(processedHistory);
  setCopyTimestamps?.(data.copyTimestamps ?? []);

  const sheets = new Set();
  storedImeis.forEach(item => { if (item.sheet) sheets.add(item.sheet); });
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

export function useImeisData(getManufacturer, setImeis, setCellTextColors, setRowActions, setCopyHistory, setCopyTimestamps, setAvailableSheets, setActiveSheet, setAvailableManufacturers, setActiveManufacturer, setHistory, setLoading, user, showHistoryModal = false) {
  useEffect(() => {
    const setters = {
      setImeis, setCellTextColors, setRowActions, setCopyHistory, setCopyTimestamps,
      setAvailableSheets, setActiveSheet, setAvailableManufacturers, setActiveManufacturer, setHistory
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
      setImeis, setCellTextColors, setRowActions, setCopyHistory, setCopyTimestamps,
      setAvailableSheets, setActiveSheet, setAvailableManufacturers, setActiveManufacturer, setHistory
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

    syncFromServer();
    const intervalId = setInterval(syncFromServer, POLL_INTERVAL_MS);

    // Echtzeit: Sofort aktualisieren wenn Büro Excel hochlädt, alle löscht etc.
    const socket = getSocket();
    const onImeisUpdated = () => {
      getImeisDataFromApi().then((data) => {
        if (data) applyImeisData(data, setters, getManufacturer, false);
      });
    };
    if (socket) {
      socket.on('imeis:updated', onImeisUpdated);
      if (!socket.connected) socket.connect();
    }

    // Fallback: Bei Tab-Wechsel neu laden (falls Socket-Event verpasst)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncFromServer();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(intervalId);
      if (socket) socket.off('imeis:updated', onImeisUpdated);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user?.id]);

  // Verlauf-Modal offen: Alle Rollen erhalten Echtzeit-Updates (IMEI-Liste + Verlauf), wenn jemand Angenommen/Abgelehnt markiert
  useEffect(() => {
    if (!showHistoryModal || !user?.id) return;
    const setters = {
      setImeis, setCellTextColors, setRowActions, setCopyHistory, setCopyTimestamps,
      setAvailableSheets, setActiveSheet, setAvailableManufacturers, setActiveManufacturer, setHistory
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
  }, [showHistoryModal, user?.id, setImeis, setCellTextColors, setRowActions, setCopyHistory, setCopyTimestamps, setAvailableSheets, setActiveSheet, setAvailableManufacturers, setActiveManufacturer, setHistory]);
}
