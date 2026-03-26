import { useState, useEffect } from 'react';

const VoucherHistoryModal = ({ isOpen, onClose, copyHistory, onUpdateHistoryAction, historyUndoStack, onUndo }) => {
  const [confirmation, setConfirmation] = useState(null);
  const [toast, setToast] = useState(null);
  const [toastProgress, setToastProgress] = useState(100);

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
            Bist du sicher, dass du den <span style={{ color: 'red' }}>CHECK-OUT</span> bei Partos durchgeführt hast?
          </>
        )
      });
    } else if (selectedValue === 'abgelehnt') {
      setConfirmation({
        index: originalIndex,
        action: 'abgelehnt',
        message: 'Bist du sicher, dass der Vertrag bei Partos abgelehnt wurde?'
      });
    } else if (selectedValue) {
      onUpdateHistoryAction(originalIndex, selectedValue);
    }
  };

  const handleConfirmYes = () => {
    if (!confirmation) return;
    onUpdateHistoryAction(confirmation.index, confirmation.action);
    setToast({
      message:
        confirmation.action === 'angenommen'
          ? 'Vertrag wurde bei Partos als angenommen bestätigt.'
          : 'Vertrag wurde bei Partos als abgelehnt bestätigt.',
      type: 'success'
    });
    setConfirmation(null);
  };

  const handleConfirmNo = () => {
    setConfirmation(null);
  };

  if (!isOpen) return null;

  const list = copyHistory.map((e, i) => ({ entry: e, originalIndex: i }));

  return (
    <div className="imeis-history-modal-overlay" onClick={onClose}>
      <div className="imeis-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="imeis-history-modal-header">
          <h3>Verlauf</h3>
          <button type="button" onClick={onClose} className="imeis-history-modal-close" aria-label="Schließen">
            ×
          </button>
        </div>
        <div className="imeis-history-modal-body">
          {list.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>Noch keine Nummern reserviert</p>
          ) : (
            <div className="imeis-history-list">
              <table className="imeis-history-table">
                <thead>
                  <tr>
                    <th>Nummer</th>
                    <th>Aktion</th>
                    <th>Voucher / Details</th>
                    <th>Benutzer</th>
                    <th>Zeitpunkt</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(({ entry, originalIndex }) => (
                    <tr key={originalIndex}>
                      <td className="imei-value">{entry.nummer}</td>
                      <td>
                        <select
                          value={
                            entry.action === 'angenommen'
                              ? 'angenommen'
                              : entry.action === 'abgelehnt'
                                ? 'abgelehnt'
                                : ''
                          }
                          onChange={(e) => handleActionSelect(originalIndex, e.target.value)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.9rem',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            backgroundColor: '#fff',
                            cursor: 'pointer',
                            minWidth: '120px'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="">Aktion wählen</option>
                          <option value="angenommen">Angenommen</option>
                          <option value="abgelehnt">Abgelehnt</option>
                        </select>
                        {entry.action === 'checkout' && (
                          <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem', fontStyle: 'italic' }}>
                            (aktuell: Reserviert / Check out)
                          </div>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {entry.product || '-'}
                      </td>
                      <td>{entry.userName}</td>
                      <td>
                        {new Date(entry.timestamp).toLocaleString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="imeis-history-modal-footer">
          <button
            type="button"
            onClick={onUndo}
            className="btn btn--primary btn--small imeis-history-undo-hidden"
            disabled={historyUndoStack.length === 0}
            style={{ marginRight: '0.5rem' }}
          >
            Rückgängig
          </button>
          <button type="button" onClick={onClose} className="btn btn--secondary btn--small">
            Schließen
          </button>
        </div>

        {confirmation && (
          <div className="imeis-confirmation-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="imeis-confirmation-dialog">
              <p className="imeis-confirmation-message">{confirmation.message}</p>
              <div className="imeis-confirmation-buttons">
                <button type="button" onClick={handleConfirmYes} className="btn btn--primary btn--small">
                  Ja
                </button>
                <button type="button" onClick={handleConfirmNo} className="btn btn--secondary btn--small">
                  Nein
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className={`imeis-toast imeis-toast--${toast.type}`} role="alert">
            <span className="imeis-toast-icon">{toast.type === 'error' ? '!' : '✓'}</span>
            <span className="imeis-toast-message">{toast.message}</span>
            <button type="button" className="imeis-toast-close" onClick={() => setToast(null)} aria-label="Schließen">
              ×
            </button>
            <div className="imeis-toast-progress" style={{ width: `${toastProgress}%` }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default VoucherHistoryModal;
