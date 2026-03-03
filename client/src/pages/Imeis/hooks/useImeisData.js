import { useEffect } from 'react';
import { loadImeisWithApi, getImeisDataFromApi, persistImeisState, shouldSkipSync } from '../../../services/imeis.service';
import { isBüroMitarbeiter } from '../../../utils/roles';

const POLL_INTERVAL_MS = 500;
const VERLAUF_REFRESH_MS = 2000;

function processCopyHistory(savedCopyHistory) {
  const uniqueHistoryMap = new Map();
  (savedCopyHistory ?? []).forEach(entry => {
    const imei = entry.imei;
    const existingEntry = uniqueHistoryMap.get(imei);
    if (!existingEntry || new Date(entry.timestamp) > new Date(existingEntry.timestamp)) {
      uniqueHistoryMap.set(imei, entry);
    }
  });
  return Array.from(uniqueHistoryMap.values())
    .map(entry => ({ ...entry, action: entry.action === 'abgelehnt' ? 'abgelehnt' : 'checkout' }))
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
    return () => clearInterval(intervalId);
  }, [user?.id]);

  // Büro Mitarbeiter: Verlauf live aktualisieren, wenn Modal offen (neue Kopien anderer Nutzer sofort sichtbar)
  useEffect(() => {
    if (!showHistoryModal || !user?.id || !isBüroMitarbeiter(user)) return;
    const refreshVerlauf = async () => {
      try {
        const data = await getImeisDataFromApi();
        if (data?.copyHistory) {
          const processed = processCopyHistory(data.copyHistory);
          setCopyHistory(processed);
        }
      } catch (_) {}
    };
    refreshVerlauf();
    const id = setInterval(refreshVerlauf, VERLAUF_REFRESH_MS);
    return () => clearInterval(id);
  }, [showHistoryModal, user?.id, setCopyHistory]);
}
