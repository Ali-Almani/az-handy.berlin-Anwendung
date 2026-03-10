import { useState } from 'react';

const ImeisRateLimitModal = ({ isOpen, onClose, message, canRequestExtra, onRequestExtra }) => {
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestError, setRequestError] = useState('');

  const handleRequestExtra = async () => {
    if (!onRequestExtra || requesting) return;
    setRequestError('');
    setRequesting(true);
    try {
      await onRequestExtra();
      setRequestSent(true);
    } catch (err) {
      setRequestError(err.response?.data?.message || err.message || 'Fehler beim Senden');
    } finally {
      setRequesting(false);
    }
  };

  const handleClose = () => {
    setRequestSent(false);
    setRequestError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="imeis-history-modal-overlay" onClick={handleClose}>
      <div className="imeis-history-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
        <div className="imeis-history-modal-header">
          <h3>Rate-Limit erreicht</h3>
          <button
            onClick={handleClose}
            className="imeis-history-modal-close"
            aria-label="Schließen"
          >
            ×
          </button>
        </div>
        <div className="imeis-history-modal-body" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1rem', color: '#d32f2f', margin: 0, lineHeight: '1.5' }}>
            {message}
          </p>
          {canRequestExtra && !requestSent && (
            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '1rem', marginBottom: 0 }}>
              Sie können eine Anfrage an Melih senden, um eine zusätzliche Kopie zu erhalten.
            </p>
          )}
          {requestSent && (
            <p style={{ fontSize: '0.95rem', color: '#2e7d32', marginTop: '1rem', marginBottom: 0 }}>
              ✓ Anfrage an Büro gesendet. Sie werden benachrichtigt, sobald eine Entscheidung vorliegt.
            </p>
          )}
          {requestError && (
            <p style={{ fontSize: '0.9rem', color: '#d32f2f', marginTop: '0.5rem', marginBottom: 0 }}>
              {requestError}
            </p>
          )}
        </div>
        <div className="imeis-history-modal-footer" style={{ justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {canRequestExtra && !requestSent && (
            <button
              onClick={handleRequestExtra}
              className="btn btn--secondary btn--small"
              disabled={requesting}
            >
              {requesting ? 'Wird gesendet...' : 'Frage an Melih senden'}
            </button>
          )}
          <button
            onClick={handleClose}
            className="btn btn--primary btn--small"
          >
            {requestSent ? 'Schließen' : 'Verstanden'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImeisRateLimitModal;
