import { useCallback, useRef, useEffect } from 'react';
import {
  putVoucherUserStateApi,
  removeVoucherListRowApi,
  restoreVoucherListRowApi,
  updateVoucherHistoryActionApi
} from '../../../services/api';
import { canUpdateVoucherHistoryForOthers } from '../../../utils/roles';
import { getRowNummer } from '../utils/voucherColumns';
import { cloneVoucherRowForApi, voucherRowsEqual } from '../utils/voucherRowApi';

const THIRTY_MINUTES = 30 * 60 * 1000;
const MAX_COPIES = 10;

function voucherRowId(row) {
  return `${row.sheet || 'default'}-${row.row}`;
}

export function useVoucherCopyHandlers({
  user,
  copyHistory,
  setCopyHistory,
  copyTimestamps,
  setCopyTimestamps,
  rowActions,
  setRowActions,
  historyUndoStack,
  setHistoryUndoStack,
  nummerKey,
  voucherArtKey,
  setShowRateLimitModal,
  setRateLimitMessage,
  setCopySuccess,
  setUploaded,
  refetchVouchers
}) {
  const stateRef = useRef({ copyHistory, copyTimestamps, rowActions });
  useEffect(() => {
    stateRef.current = { copyHistory, copyTimestamps, rowActions };
  }, [copyHistory, copyTimestamps, rowActions]);

  const persistVoucher = useCallback((partial) => {
    const body = { ...stateRef.current, ...partial };
    stateRef.current = body;
    putVoucherUserStateApi(body).catch((err) => console.error('Voucher-Zustand speichern:', err));
  }, []);

  const checkCopyRateLimit = useCallback(() => {
    if (!user) return { allowed: true, remaining: MAX_COPIES, count: 0 };
    const now = Date.now();
    const recentCopies = (copyTimestamps ?? []).filter((t) => now - t < THIRTY_MINUTES);
    return {
      allowed: recentCopies.length < MAX_COPIES,
      remaining: Math.max(0, MAX_COPIES - recentCopies.length),
      count: recentCopies.length
    };
  }, [user, copyTimestamps]);

  const registerCopyAction = useCallback(() => {
    if (!user) return;
    const now = Date.now();
    const recentCopies = (copyTimestamps ?? []).filter((t) => now - t < THIRTY_MINUTES);
    recentCopies.push(now);
    setCopyTimestamps(recentCopies);
    persistVoucher({ copyTimestamps: recentCopies });
  }, [user, copyTimestamps, setCopyTimestamps, persistVoucher]);

  const showRateLimitError = useCallback(() => {
    const now = Date.now();
    const recentCopies = (copyTimestamps ?? []).filter((t) => now - t < THIRTY_MINUTES);
    const minutesRemaining =
      recentCopies.length > 0
        ? Math.ceil((THIRTY_MINUTES - (now - Math.min(...recentCopies))) / (60 * 1000))
        : 30;
    setRateLimitMessage(
      `Rate-Limit erreicht! Sie haben bereits 10 Nummern innerhalb der letzten 30 Minuten reserviert/kopiert. Bitte warten Sie noch ${minutesRemaining} Minute(n).`
    );
    setShowRateLimitModal(true);
  }, [copyTimestamps, setRateLimitMessage, setShowRateLimitModal]);

  const productLabelForHistory = useCallback(
    (row) => {
      const art =
        voucherArtKey && row?.rowData?.[voucherArtKey] != null
          ? String(row.rowData[voucherArtKey]).trim()
          : '';
      if (art) return art;
      const keys = row?.columnOrder?.length ? row.columnOrder : Object.keys(row?.rowData || {});
      const skip = new Set([nummerKey, voucherArtKey].filter(Boolean));
      const parts = [];
      keys.forEach((k) => {
        if (skip.has(k)) return;
        const v = row.rowData?.[k];
        if (v != null && String(v).trim()) parts.push(String(v).trim());
      });
      return parts.length ? parts.join(' · ') : '-';
    },
    [nummerKey, voucherArtKey]
  );

  const afterReserveSuccess = useCallback(
    (row, rowSnapshot) => {
      const nummer = getRowNummer(row, nummerKey);
      const historyEntry = {
        nummer,
        product: productLabelForHistory(row),
        action: 'checkout',
        timestamp: new Date().toISOString(),
        userName: user?.name || 'Unbekannt',
        historyOwnerUserId: user?.id ?? null,
        sheet: row.sheet || 'default',
        row: row.row,
        rowSnapshot
      };
      const updatedHistory = [
        historyEntry,
        ...copyHistory.filter((e) => !(e.sheet === historyEntry.sheet && e.row === historyEntry.row))
      ].slice(0, 100);
      setCopyHistory(updatedHistory);
      persistVoucher({ copyHistory: updatedHistory });
      setCopySuccess?.(true);
      setTimeout(() => setCopySuccess?.(false), 2000);
    },
    [nummerKey, productLabelForHistory, user, copyHistory, setCopyHistory, persistVoucher, setCopySuccess]
  );

  const handleDropdownSelect = useCallback(
    async (row) => {
      const rateLimit = checkCopyRateLimit();
      if (!rateLimit.allowed) {
        showRateLimitError();
        return;
      }
      const nummer = getRowNummer(row, nummerKey);
      if (!nummer) {
        alert('Keine Nummer in der erkannten Spalte – bitte Excel-Spalte „Nummer“ o. ä. prüfen.');
        return;
      }
      const rowSnapshot = cloneVoucherRowForApi(row);
      if (!rowSnapshot) {
        alert('Zeile konnte nicht verarbeitet werden.');
        return;
      }
      try {
        await removeVoucherListRowApi(rowSnapshot);
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || err.message || 'Reservieren fehlgeschlagen – Zeile nicht entfernt.');
        return;
      }
      setUploaded((prev) => prev.filter((r) => !voucherRowsEqual(r, row)));
      try {
        await navigator.clipboard.writeText(nummer);
      } catch (e) {
        console.error(e);
        alert('Zeile entfernt, aber Kopieren in die Zwischenablage fehlgeschlagen: ' + e.message);
      }
      registerCopyAction();
      afterReserveSuccess(row, rowSnapshot);
      const rowId = voucherRowId(row);
      const nextRowActions = { ...rowActions };
      delete nextRowActions[rowId];
      setRowActions(nextRowActions);
      persistVoucher({ rowActions: nextRowActions });
    },
    [
      checkCopyRateLimit,
      showRateLimitError,
      nummerKey,
      setUploaded,
      registerCopyAction,
      afterReserveSuccess,
      rowActions,
      setRowActions,
      persistVoucher
    ]
  );

  const clearRowActionForEntry = useCallback(
    (entry) => {
      const rowId = `${entry.sheet || 'default'}-${entry.row}`;
      const next = { ...rowActions };
      delete next[rowId];
      setRowActions(next);
      return next;
    },
    [rowActions, setRowActions]
  );

  const handleUpdateHistoryAction = useCallback(
    async (index, newAction) => {
      if (index < 0 || index >= copyHistory.length) return;
      const entry = copyHistory[index];

      if (
        canUpdateVoucherHistoryForOthers(user) &&
        (newAction === 'angenommen' || newAction === 'abgelehnt')
      ) {
        try {
          await updateVoucherHistoryActionApi({
            userName: entry.userName,
            historyOwnerUserId: entry.historyOwnerUserId ?? null,
            newAction,
            nummer: entry.nummer,
            timestamp: entry.timestamp,
            sheet: entry.sheet,
            row: entry.row
          });
          await refetchVouchers?.();
        } catch (err) {
          alert(err.response?.data?.message || err.message || 'Aktion fehlgeschlagen.');
          throw err;
        }
        return;
      }

      const oldAction = entry.action || null;
      setHistoryUndoStack((prev) => [
        ...prev,
        { index, entry: { ...entry }, oldAction, newAction, rowActionsSnapshot: { ...rowActions } }
      ]);

      if (newAction === 'angenommen') {
        try {
          if (entry.rowSnapshot) {
            await removeVoucherListRowApi(entry.rowSnapshot, { allowMissing: true });
          }
        } catch (err) {
          console.error(err);
        }
        if (entry.rowSnapshot) {
          setUploaded((prev) => prev.filter((r) => !voucherRowsEqual(r, entry.rowSnapshot)));
        }
        const updatedHistory = copyHistory.filter((_, i) => i !== index);
        const updatedRowActions = clearRowActionForEntry(entry);
        setCopyHistory(updatedHistory);
        persistVoucher({ copyHistory: updatedHistory, rowActions: updatedRowActions });
        return;
      }
      if (newAction === 'abgelehnt') {
        if (entry.rowSnapshot) {
          try {
            await restoreVoucherListRowApi(entry.rowSnapshot);
            setUploaded((prev) => {
              if (prev.some((r) => voucherRowsEqual(r, entry.rowSnapshot))) return prev;
              return [...prev, entry.rowSnapshot];
            });
          } catch (err) {
            alert(err.response?.data?.message || err.message || 'Zeile konnte nicht wiederhergestellt werden.');
            setHistoryUndoStack((prev) => prev.slice(0, -1));
            throw err;
          }
        }
        let updatedRowActions = { ...rowActions };
        const rowId = `${entry.sheet || 'default'}-${entry.row}`;
        delete updatedRowActions[rowId];
        setRowActions(updatedRowActions);
        const updatedHistory = copyHistory.filter((_, i) => i !== index);
        setCopyHistory(updatedHistory);
        persistVoucher({ copyHistory: updatedHistory, rowActions: updatedRowActions });
        return;
      }
      const updatedHistory = [...copyHistory];
      updatedHistory[index] = {
        ...updatedHistory[index],
        action: newAction || null,
        userName: user?.name || updatedHistory[index].userName || 'Unbekannt',
        timestamp: new Date().toISOString()
      };
      setCopyHistory(updatedHistory);
      persistVoucher({ copyHistory: updatedHistory });
    },
    [
      copyHistory,
      user,
      rowActions,
      setCopyHistory,
      setHistoryUndoStack,
      clearRowActionForEntry,
      persistVoucher,
      setUploaded,
      refetchVouchers
    ]
  );

  const handleHistoryModalUndo = useCallback(() => {
    if (historyUndoStack.length === 0) return;
    const undoState = historyUndoStack[historyUndoStack.length - 1];
    if (undoState.newAction === 'angenommen' || undoState.newAction === 'abgelehnt') {
      const updatedHistory = [...copyHistory];
      updatedHistory.splice(undoState.index, 0, undoState.entry);
      setCopyHistory(updatedHistory);
      if (undoState.newAction === 'abgelehnt') {
        setRowActions(undoState.rowActionsSnapshot);
        persistVoucher({ copyHistory: updatedHistory, rowActions: undoState.rowActionsSnapshot });
        if (undoState.entry.rowSnapshot) {
          void removeVoucherListRowApi(undoState.entry.rowSnapshot).catch(() => {});
          setUploaded((prev) => prev.filter((r) => !voucherRowsEqual(r, undoState.entry.rowSnapshot)));
        }
      } else {
        persistVoucher({ copyHistory: updatedHistory });
      }
    } else {
      const updatedHistory = [...copyHistory];
      updatedHistory[undoState.index] = { ...undoState.entry, action: undoState.oldAction };
      setCopyHistory(updatedHistory);
      persistVoucher({ copyHistory: updatedHistory });
    }
    setHistoryUndoStack((prev) => prev.slice(0, -1));
  }, [historyUndoStack, copyHistory, setCopyHistory, setRowActions, setHistoryUndoStack, persistVoucher, setUploaded]);

  const onRowActionRemove = useCallback(
    (rowId) => {
      const next = { ...rowActions };
      delete next[rowId];
      setRowActions(next);
      persistVoucher({ rowActions: next });
    },
    [rowActions, setRowActions, persistVoucher]
  );

  return {
    handleDropdownSelect,
    handleUpdateHistoryAction,
    handleHistoryModalUndo,
    onRowActionRemove,
    checkCopyRateLimit,
    voucherRowId
  };
}
