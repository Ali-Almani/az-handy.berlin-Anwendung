import { useCallback, useRef } from 'react';
import { setHistoryActionCooldown, notifyReminderResponseApi } from '../../../services/imeis.service';

const THIRTY_MINUTES = 30 * 60 * 1000;
/** Rate-Limit: 10 Kopien pro Konto innerhalb 30 Min – gilt für alle Rollen */
const MAX_COPIES = 10;

export function useImeisCopyHandlers({
  user,
  copyHistory,
  setCopyHistory,
  copyTimestamps,
  setCopyTimestamps,
  rowActions,
  setRowActions,
  historyUndoStack,
  setHistoryUndoStack,
  selectedCells,
  currentImeis,
  getManufacturer,
  getProductFull,
  setShowRateLimitModal,
  setRateLimitMessage,
  setSelectedRowForDropdown,
  setCopySuccess,
  expandSelection,
  persistImeis,
  updateHistoryActionApi,
  canUpdateOthersHistory = false,
  setImeis,
  refreshImeisFromApi
}) {
  const historyActionPendingRef = useRef(new Set());
  const normHistName = useCallback((s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase(), []);

  const historyActionKey = useCallback(
    (entry) =>
      `${String(entry?.imei || '').trim()}|${String(entry?.timestamp || '')}|${normHistName(entry?.userName)}`,
    [normHistName]
  );

  const addHistoryEntry = useCallback((entry) => {
    if (!entry?.imei) return;
    const imeiToStore = String(entry.imei || '').trim();
    const nextEntry = {
      imei: imeiToStore,
      product: entry.product ?? '-',
      action: entry.action ?? null,
      timestamp: entry.timestamp ?? new Date().toISOString(),
      userName: entry.userName ?? user?.name ?? 'Unbekannt'
    };
    const updatedHistory = [nextEntry, ...(copyHistory || []).filter((e) => String(e?.imei || '').trim() !== imeiToStore)].slice(0, 100);
    setCopyHistory(updatedHistory);
    persistImeis?.({ copyHistory: updatedHistory });
  }, [copyHistory, persistImeis, setCopyHistory, user?.name]);

  const checkCopyRateLimit = useCallback(() => {
    if (!user) return { allowed: true, remaining: MAX_COPIES, count: 0 };
    const now = Date.now();
    const recentCopies = (copyTimestamps ?? []).filter(t => (now - t) < THIRTY_MINUTES);
    return { allowed: recentCopies.length < MAX_COPIES, remaining: Math.max(0, MAX_COPIES - recentCopies.length), count: recentCopies.length };
  }, [user, copyTimestamps]);

  const registerCopyAction = useCallback(() => {
    if (!user) return;
    const now = Date.now();
    const recentCopies = (copyTimestamps ?? []).filter(t => (now - t) < THIRTY_MINUTES);
    recentCopies.push(now);
    setCopyTimestamps(recentCopies);
    persistImeis?.({ copyTimestamps: recentCopies });
  }, [user, copyTimestamps, setCopyTimestamps, persistImeis]);

  const showRateLimitError = useCallback(() => {
    const now = Date.now();
    const recentCopies = (copyTimestamps ?? []).filter(t => (now - t) < THIRTY_MINUTES);
    const minutesRemaining = recentCopies.length > 0
      ? Math.ceil((THIRTY_MINUTES - (now - Math.min(...recentCopies))) / (60 * 1000))
      : 30;
    setRateLimitMessage(`Rate-Limit erreicht! Sie haben bereits 10 IMEIs innerhalb der letzten 30 Minuten kopiert. Bitte warten Sie noch ${minutesRemaining} Minute(n).`);
    setShowRateLimitModal(true);
  }, [copyTimestamps, setRateLimitMessage, setShowRateLimitModal]);

  const handleCopyRow = useCallback(async (item) => {
    try {
      const rateLimit = checkCopyRateLimit();
      if (!rateLimit.allowed) {
        showRateLimitError();
        return;
      }
      const imeiToCopy = String(item.imei || '').trim();
      if (imeiToCopy) {
        await navigator.clipboard.writeText(imeiToCopy);
        registerCopyAction();
        const productFull = getProductFull(item);
        let productForHistory = productFull || '';
        const manufacturer = getManufacturer(item);
        if (manufacturer && productForHistory) {
          const productLower = productForHistory.toLowerCase();
          if (productLower.startsWith(manufacturer.toLowerCase())) productForHistory = productForHistory.substring(manufacturer.length).trim();
          productForHistory = productForHistory.replace(new RegExp(`\\b${manufacturer}\\b`, 'gi'), '').trim().replace(/\s+/g, ' ').trim();
        }
        addHistoryEntry({
          imei: imeiToCopy,
          product: productForHistory || '-',
          action: 'checkout',
          timestamp: new Date().toISOString(),
          userName: user?.name || 'Unbekannt'
        });
        setCopySuccess?.(true);
        setTimeout(() => setCopySuccess?.(false), 2000);
        setSelectedRowForDropdown(null);
      }
    } catch (error) {
      console.error('Error copying IMEI to clipboard:', error);
      alert('Fehler beim Kopieren in die Zwischenablage: ' + error.message);
    }
  }, [getProductFull, getManufacturer, user, checkCopyRateLimit, registerCopyAction, setSelectedRowForDropdown, showRateLimitError, addHistoryEntry, setCopySuccess]);

  const handleDropdownSelect = useCallback(async (item, action) => {
    const rowId = `${item.sheet || 'default'}-${item.imei}-${item.row}`;
    // Timestamp einmal erzeugen und für rowAction + Verlauf wiederverwenden,
    // damit Server-Synthese (aus rowActions) keinen doppelten Verlaufseintrag erzeugt.
    const ts = new Date().toISOString();
    const actionData = { action, userName: user?.name || 'Unbekannt', timestamp: ts };
    const updatedActions = { ...rowActions, [rowId]: actionData };
    setRowActions(updatedActions);
    persistImeis?.({ rowActions: updatedActions });

    // „Reservieren“: soll in Verlauf erscheinen, IMEI kopieren, aber NICHT als Copy/Checkout zählen.
    if (action === 'reservieren') {
      const imeiToCopy = String(item?.imei || '').trim();
      if (imeiToCopy) {
        try {
          await navigator.clipboard.writeText(imeiToCopy);
          setCopySuccess?.(true);
          setTimeout(() => setCopySuccess?.(false), 2000);
          setSelectedRowForDropdown?.(null);
        } catch (_) {}
      }
      const productFull = getProductFull(item);
      addHistoryEntry({
        imei: String(item?.imei || '').trim(),
        product: productFull || '-',
        action: 'reservieren',
        timestamp: ts,
        userName: user?.name || 'Unbekannt'
      });
      return;
    }

    // Für alle Copy-Aktionen: Rate-Limit prüfen + kopieren (checkout Verlauf)
    const rateLimit = checkCopyRateLimit();
    if (!rateLimit.allowed) {
      showRateLimitError();
      return;
    }
    await handleCopyRow(item);
  }, [handleCopyRow, user, rowActions, setRowActions, checkCopyRateLimit, showRateLimitError, persistImeis, setRowActions, getProductFull, addHistoryEntry]);

  const handleUpdateHistoryAction = useCallback(async (index, newAction) => {
    if (index < 0 || index >= copyHistory.length) return false;
    const entry = copyHistory[index];
    const pendingKey = historyActionKey(entry);
    if (historyActionPendingRef.current.has(pendingKey)) return false;

    const oldAction = entry.action || null;
    const isSelfHistoryEntry =
      entry.userName &&
      normHistName(entry.userName) === normHistName(user?.name || '');
    /** Server-PATCH: alle Rollen für angenommen/abgelehnt (Server prüft Berechtigung) */
    const isServerHistoryAction =
      (newAction === 'angenommen' || newAction === 'abgelehnt') &&
      updateHistoryActionApi &&
      entry.userName;

    if (!isServerHistoryAction) {
      const undoState = { index, entry: { ...entry }, oldAction, newAction, rowActionsSnapshot: { ...rowActions } };
      setHistoryUndoStack((prev) => [...prev, undoState]);
    }

    if (isServerHistoryAction) {
      historyActionPendingRef.current.add(pendingKey);
      const imeiStr = String(entry.imei || '').trim();
      const updatedHistory = copyHistory.filter((_, i) => i !== index);
      const updatedRowActions = { ...rowActions };
      Object.keys(updatedRowActions).forEach((rowId) => {
        if (rowId.includes(`-${imeiStr}-`)) delete updatedRowActions[rowId];
      });

      setCopyHistory(updatedHistory);
      setRowActions(updatedRowActions);
      if (newAction === 'angenommen' && setImeis) {
        setImeis((prev) => prev.filter((it) => String(it?.imei || '').trim() !== imeiStr));
      }
      setHistoryActionCooldown();

      try {
        const targetUserId = canUpdateOthersHistory ? undefined : user?.id;
        await updateHistoryActionApi(
          entry.imei,
          entry.userName,
          newAction,
          targetUserId,
          entry.timestamp,
          entry.product
        );
        if (isSelfHistoryEntry) {
          notifyReminderResponseApi(imeiStr, newAction);
        }
        return true;
      } catch (err) {
        setCopyHistory(copyHistory);
        setRowActions(rowActions);
        alert('Fehler beim Aktualisieren der Aktion: ' + (err.response?.data?.message || err.message));
        throw err;
      } finally {
        historyActionPendingRef.current.delete(pendingKey);
      }
    }

    if (newAction === 'angenommen') {
      const imeiStr = String(entry.imei || '').trim();
      const updatedHistory = copyHistory.filter((_, i) => i !== index);
      setCopyHistory(updatedHistory);
      if (setImeis) setImeis(prev => prev.filter(item => String(item?.imei || '').trim() !== imeiStr));
      const updatedRowActions = { ...rowActions };
      Object.keys(updatedRowActions).forEach(rowId => {
        if (rowId.includes(`-${imeiStr}-`)) delete updatedRowActions[rowId];
      });
      setRowActions(updatedRowActions);
      persistImeis?.({ copyHistory: updatedHistory, removedImei: imeiStr, rowActions: updatedRowActions });
      notifyReminderResponseApi(imeiStr, 'angenommen');
      return;
    }
    if (newAction === 'abgelehnt') {
      const imeiToReject = entry.imei;
      const updatedRowActions = { ...rowActions };
      Object.keys(updatedRowActions).forEach(rowId => {
        if (rowId.includes(`-${imeiToReject}-`)) delete updatedRowActions[rowId];
      });
      setRowActions(updatedRowActions);
      const updatedHistory = copyHistory.filter((_, i) => i !== index);
      setCopyHistory(updatedHistory);
      persistImeis?.({ rowActions: updatedRowActions, copyHistory: updatedHistory });
      notifyReminderResponseApi(String(imeiToReject || '').trim(), 'abgelehnt');
      return;
    }
    const updatedHistory = [...copyHistory];
    updatedHistory[index] = { ...updatedHistory[index], action: newAction || null, userName: user?.name || updatedHistory[index].userName || 'Unbekannt', timestamp: new Date().toISOString() };
    setCopyHistory(updatedHistory);
    persistImeis?.({ copyHistory: updatedHistory });
    return true;
  }, [
    copyHistory,
    user,
    rowActions,
    setCopyHistory,
    setRowActions,
    setHistoryUndoStack,
    canUpdateOthersHistory,
    updateHistoryActionApi,
    setImeis,
    historyActionKey,
    normHistName,
    persistImeis
  ]);

  const handleHistoryModalUndo = useCallback(() => {
    if (historyUndoStack.length === 0) return;
    const undoState = historyUndoStack[historyUndoStack.length - 1];
    if (undoState.newAction === 'angenommen' || undoState.newAction === 'abgelehnt') {
      const updatedHistory = [...copyHistory];
      updatedHistory.splice(undoState.index, 0, undoState.entry);
      setCopyHistory(updatedHistory);
      if (undoState.newAction === 'abgelehnt') {
        setRowActions(undoState.rowActionsSnapshot);
        persistImeis?.({ copyHistory: updatedHistory, rowActions: undoState.rowActionsSnapshot });
      } else {
        persistImeis?.({ copyHistory: updatedHistory });
      }
    } else {
      const updatedHistory = [...copyHistory];
      updatedHistory[undoState.index] = { ...undoState.entry, action: undoState.oldAction };
      setCopyHistory(updatedHistory);
      persistImeis?.({ copyHistory: updatedHistory });
    }
    setHistoryUndoStack(prev => prev.slice(0, -1));
  }, [historyUndoStack, copyHistory, setCopyHistory, setRowActions, setHistoryUndoStack]);

  const handleCopySelected = useCallback(async () => {
    if (selectedCells.size === 0) return;
    try {
      const selectedRows = new Map();
      const uniqueImeis = new Set();
      selectedCells.forEach(cellId => {
        const parts = cellId.split('-');
        if (parts.length >= 3) {
          const [sheet, imei, row] = parts;
          const column = parts.slice(3).join('-') || 'row';
          const rowKey = `${sheet}-${imei}-${row}`;
          if (!selectedRows.has(rowKey)) {
            selectedRows.set(rowKey, { sheet, imei, row, columns: new Set() });
            if (imei) uniqueImeis.add(imei);
          }
          selectedRows.get(rowKey).columns.add(column);
        }
      });
      const rateLimit = checkCopyRateLimit();
      const imeisToCopy = uniqueImeis.size;
      const totalAfterCopy = rateLimit.count + imeisToCopy;
      if (totalAfterCopy > MAX_COPIES) {
        const remaining = Math.max(0, MAX_COPIES - rateLimit.count);
        if (remaining === 0) {
          showRateLimitError();
        } else {
          setRateLimitMessage(`Sie können nur noch ${remaining} IMEI(s) innerhalb der nächsten 30 Minuten kopieren. Sie haben ${imeisToCopy} IMEI(s) ausgewählt. Bitte reduzieren Sie die Auswahl auf ${remaining} IMEI(s).`);
          setShowRateLimitModal(true);
        }
        return;
      }
      const rowsToCopy = [];
      selectedRows.forEach((rowInfo, rowKey) => {
        const item = currentImeis.find(i => `${i.sheet || 'default'}-${i.imei}-${i.row}` === rowKey);
        if (item) {
          const rowData = [];
          const isImeiSelected = rowInfo.columns.has('imei');
          const manufacturerKey = Object.keys(item.rowData || {}).find(key => {
            const lowerKey = key.toLowerCase();
            return lowerKey.includes('hersteller') || lowerKey.includes('manufacturer') || lowerKey.includes('marke') || lowerKey.includes('brand');
          });
          const isManufacturerSelected = manufacturerKey && rowInfo.columns.has(manufacturerKey);
          if ((isImeiSelected && isManufacturerSelected) || (isImeiSelected && !manufacturerKey) || (!isImeiSelected && !isManufacturerSelected)) {
            rowData.push(item.imei || '');
            rowData.push(getManufacturer(item) || '');
          } else {
            if (isImeiSelected) rowData.push(item.imei || '');
            if (isManufacturerSelected && manufacturerKey) rowData.push(getManufacturer(item) || '');
          }
          while (rowData.length > 0 && (rowData[rowData.length - 1] === '' || rowData[rowData.length - 1] == null)) rowData.pop();
          if (rowData.length > 0) rowsToCopy.push(rowData);
        }
      });
      const textToCopy = rowsToCopy
        .map(row => {
          const cleanedRow = [...row];
          while (cleanedRow.length > 0 && (!cleanedRow[cleanedRow.length - 1] || String(cleanedRow[cleanedRow.length - 1]).trim() === '')) cleanedRow.pop();
          return cleanedRow.map(cell => String(cell || '').trim().replace(/\t/g, ' ')).join('\t');
        })
        .filter(row => row.trim() !== '')
        .join('\n');
      if (textToCopy) {
        await navigator.clipboard.writeText(textToCopy);
        uniqueImeis.forEach(() => registerCopyAction());
        setCopySuccess?.(true);
        setTimeout(() => setCopySuccess?.(false), 2000);
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Fehler beim Kopieren in die Zwischenablage');
    }
  }, [selectedCells, currentImeis, checkCopyRateLimit, registerCopyAction, user, getManufacturer, showRateLimitError, setRateLimitMessage, setShowRateLimitModal, setCopySuccess]);

  return {
    handleCopyRow,
    handleDropdownSelect,
    handleUpdateHistoryAction,
    handleHistoryModalUndo,
    handleCopySelected,
    checkCopyRateLimit,
    registerCopyAction
  };
}
