const ImeisRateLimitModal = ({ isOpen, onClose, message }) => {
  if (!isOpen) return null;

  return (
    <div className="imeis-history-modal-overlay" onClick={onClose}>
      <div className="imeis-history-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
        <div className="imeis-history-modal-header">
          <h3>Rate-Limit erreicht</h3>
          <button
            onClick={onClose}
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
        </div>
        <div className="imeis-history-modal-footer" style={{ justifyContent: 'center' }}>
          <button
            onClick={onClose}
            className="btn btn--primary btn--small"
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImeisRateLimitModal;
