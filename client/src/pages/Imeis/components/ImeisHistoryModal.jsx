import { useState, useEffect } from 'react';
import { parseCopyHistoryTimestamp } from '../utils/copyHistoryRetention';
import { getProductFull } from '../utils/imeisProductUtils';
import { normalizeImeiSortKey } from '../utils/imeisSortUtils';

function formatHistoryTimestamp(entry) {
  const ts = parseCopyHistoryTimestamp(entry);
  if (Number.isNaN(ts)) return '–';
  return new Date(ts).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function historyProductLabel(entry, imeis) {
  const stored = String(entry?.product || entry?.manufacturer || '').trim();
  if (stored && stored !== '-') return stored;
  const key = normalizeImeiSortKey(entry?.imei);
  if (!key || !Array.isArray(imeis)) return stored || '-';
  const item = imeis.find((it) => normalizeImeiSortKey(it?.imei) === key);
  const fromList = getProductFull(item);
  return fromList || stored || '-';
}

const ImeisHistoryModal = ({
  isOpen,
  onClose,
  copyHistory,
  imeis = [],
  filterImeis,
  onUpdateHistoryAction,
  historyUndoStack,
  onUndo,
  canSendReminder = false,
  currentUserName = '',
  currentUserId = null,
  onSendReminder
}) => {
  const [confirmation, setConfirmation] = useState(null); // { index, action, message }
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [processingIndex, setProcessingIndex] = useState(null);
  const [toast, setToast] = useState(null); // { message, type: 'success' }
  const [toastProgress, setToastProgress] = useState(100);
  const [sendingReminderFor, setSendingReminderFor] = useState(null);

  useEffect(() => {
    if (!toast) return;
    setToastProgress(100);
    const duration = 2000;
    const interval = 50;
    const step = (interval / duration) * 100;
    const progressTimer = setInterval(() => {
      setToastProgress((p) => {
        const next = p - step;
        return next <= 0 ? 0 : next;
      });
    }, interval);
    const hideTimer = setTimeout(() => setToast(null), duration);
    return () => {
      clearInterval(progressTimer);
      clearTimeout(hideTimer);
    };
  }, [toast]);

  const handleActionSelect = (originalIndex, selectedValue) => {
    if (selectedValue === 'angenommen') {
      setConfirmation({
        index: originalIndex,
        action: 'angenommen',
        message: (
          <>
            CHECK-OUT bei Partos durchgeführt? Die IMEI wird <strong>aus der Liste und dem Verlauf</strong> entfernt.
          </>
        )
      });
    } else if (selectedValue === 'abgelehnt') {
      setConfirmation({
        index: originalIndex,
        action: 'abgelehnt',
        message:
          'Vertrag bei Partos abgelehnt? Der Verlaufseintrag wird entfernt und die IMEI erscheint wieder in der Liste.'
      });
    } else if (selectedValue) {
      onUpdateHistoryAction(originalIndex, selectedValue);
    }
  };

  const handleConfirmYes = async () => {
    if (!confirmation || confirmBusy) return;
    setConfirmBusy(true);
    setProcessingIndex(confirmation.index);
    try {
      await onUpdateHistoryAction(confirmation.index, confirmation.action);
      setToast({
        message:
          confirmation.action === 'angenommen'
            ? 'Angenommen: IMEI wurde aus der Liste und dem Verlauf entfernt.'
            : 'Abgelehnt: Verlauf entfernt, IMEI wieder in der Liste.',
        type: 'success'
      });
      setConfirmation(null);
    } catch {
      // Fehler wird im Handler angezeigt
    } finally {
      setConfirmBusy(false);
      setProcessingIndex(null);
    }
  };

  const handleConfirmNo = () => {
    setConfirmation(null);
  };

  const handleSendReminder = async (entry) => {
    if (!onSendReminder || !entry?.imei) return;
    if (!entry?.userName && entry?.historyOwnerUserId == null) return;
    const hasIds = currentUserId != null && entry?.historyOwnerUserId != null;
    const isSelfById = hasIds && String(entry.historyOwnerUserId) === String(currentUserId);
    const isSelfByName =
      !hasIds &&
      String(entry.userName || '').trim() !== '' &&
      String(entry.userName || '').trim() === String(currentUserName || '').trim();
    if (isSelfById || isSelfByName) return;
    setSendingReminderFor(entry.imei);
    try {
      await onSendReminder(entry);
      setToast({ message: 'Erinnerung gesendet.', type: 'success' });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Erinnerung konnte nicht gesendet werden.';
      setToast({ message: msg, type: 'error' });
    } finally {
      setSendingReminderFor(null);
    }
  };

  if (!isOpen) return null;

  const filteredHistory = filterImeis?.length
    ? copyHistory
        .map((e, i) => ({ entry: e, originalIndex: i }))
        .filter(({ entry }) => filterImeis.includes(String(entry.imei || '').trim()))
    : copyHistory.map((e, i) => ({ entry: e, originalIndex: i }));

  return (
    <div className="imeis-history-modal-overlay" onClick={onClose}>
      <div className="imeis-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="imeis-history-modal-header">
          <h3>Verlauf</h3>
          <button
            onClick={onClose}
            className="imeis-history-modal-close"
            aria-label="Schließen"
          >
            ×
          </button>
        </div>
        <div className="imeis-history-modal-body">
          {filteredHistory.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
              {filterImeis?.length ? 'Keine Verlaufseinträge für die Erinnerungs-IMEIs gefunden.' : 'Noch keine IMEIs kopiert'}
            </p>
          ) : (
            <div className="imeis-history-list">
              {filterImeis?.length > 0 && (
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.75rem' }}>
                  Nur IMEIs aus deinen Erinnerungen werden angezeigt.
                </p>
              )}
              <table className="imeis-history-table">
                <thead>
                  <tr>
                    <th>IMEI</th>
                    <th>Aktion</th>
                    <th>Produkt</th>
                    <th>Benutzer</th>
                    <th>Zeitpunkt</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map(({ entry, originalIndex }) => (
                    <tr key={`${entry.imei}-${entry.userName}-${entry.timestamp}-${originalIndex}`}>
                      <td className="imei-value">{entry.imei}</td>
                      <td>
                        <select
                          value={
                            entry.action === 'angenommen'
                              ? 'angenommen'
                              : entry.action === 'abgelehnt'
                                ? 'abgelehnt'
                                : ''
                          }
                          disabled={processingIndex === originalIndex || confirmBusy}
                          onChange={(e) => {
                            const selectedValue = e.target.value;
                            handleActionSelect(originalIndex, selectedValue);
                          }}
                          className="imeis-history-action-select"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="">Aktion wählen</option>
                          <option value="angenommen">Angenommen</option>
                          <option value="abgelehnt">Abgelehnt</option>
                        </select>
                        {entry.action === 'checkout' && (
                          <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem', fontStyle: 'italic' }}>
                            (aktuell: Check out)
                          </div>
                        )}
                        {entry.action === 'reservieren' && (
                          <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem', fontStyle: 'italic' }}>
                            (aktuell: Reservieren)
                          </div>
                        )}
                        {entry.action === 'dereserviert' && (
                          <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem', fontStyle: 'italic' }}>
                            (aktuell: Dereserviert)
                          </div>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{historyProductLabel(entry, imeis)}</td>
                      <td>
                        {entry.userName}
                        {canSendReminder && (() => {
                          const hasIds = currentUserId != null && entry?.historyOwnerUserId != null;
                          const isSelfById = hasIds && String(entry.historyOwnerUserId) === String(currentUserId);
                          const isSelfByName =
                            !hasIds &&
                            String(entry.userName || '').trim() !== '' &&
                            String(entry.userName || '').trim() === String(currentUserName || '').trim();
                          return !(isSelfById || isSelfByName);
                        })() && (
                          <button
                            type="button"
                            className="imeis-history-reminder-btn"
                            onClick={(e) => { e.stopPropagation(); handleSendReminder(entry); }}
                            disabled={sendingReminderFor === entry.imei}
                            title="Erinnerung: Benutzt du noch diese IMEI?"
                          >
                            {sendingReminderFor === entry.imei ? '…' : 'Erinnerung senden'}
                          </button>
                        )}
                      </td>
                      <td>{formatHistoryTimestamp(entry)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="imeis-history-modal-footer">
          <button
            onClick={onUndo}
            className="btn btn--primary btn--small imeis-history-undo-hidden"
            disabled={historyUndoStack.length === 0}
            style={{ marginRight: '0.5rem' }}
          >
            Rückgängig
          </button>
          <button
            onClick={onClose}
            className="btn btn--secondary btn--small"
          >
            Schließen
          </button>
        </div>

        {/* Bestätigungsdialog für Aktionen */}
        {confirmation && (
          <div 
            className="imeis-confirmation-overlay" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="imeis-confirmation-dialog">
              <p className="imeis-confirmation-message">{confirmation.message}</p>
              <div className="imeis-confirmation-buttons">
                <button
                  onClick={handleConfirmYes}
                  className="btn btn--primary btn--small"
                  disabled={confirmBusy}
                >
                  {confirmBusy ? 'Wird übernommen…' : 'Ja'}
                </button>
                <button
                  onClick={handleConfirmNo}
                  className="btn btn--secondary btn--small"
                  disabled={confirmBusy}
                >
                  Nein
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast-Benachrichtigung */}
        {toast && (
          <div 
            className={`imeis-toast imeis-toast--${toast.type}`}
            role="alert"
          >
            <span className="imeis-toast-icon">{toast.type === 'error' ? '!' : '✓'}</span>
            <span className="imeis-toast-message">{toast.message}</span>
            <button
              className="imeis-toast-close"
              onClick={() => setToast(null)}
              aria-label="Schließen"
            >
              ×
            </button>
            <div 
              className="imeis-toast-progress" 
              style={{ width: `${toastProgress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ImeisHistoryModal;
