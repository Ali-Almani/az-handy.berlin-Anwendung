import './ExtraCopyRequestsModal.scss';

const ExtraCopyRequestsModal = ({ isOpen, onClose, requests, loading, onApprove, onReject }) => {
  if (!isOpen) return null;

  return (
    <div className="imeis-history-modal-overlay" onClick={onClose}>
      <div className="imeis-history-modal extra-copy-requests-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', width: '90%' }}>
        <div className="imeis-history-modal-header">
          <h3>Anfragen für Extra-Kopie</h3>
          <button onClick={onClose} className="imeis-history-modal-close" aria-label="Schließen">
            ×
          </button>
        </div>
        <div className="imeis-history-modal-body">
          {requests.length === 0 ? (
            <p style={{ color: '#666', margin: 0 }}>Keine offenen Anfragen.</p>
          ) : (
            <ul className="extra-copy-requests-list">
              {requests.map((r) => (
                <li key={r.id} className="extra-copy-request-item">
                  <div className="extra-copy-request-info">
                    <strong>{r.requester_user_name || 'Unbekannt'}</strong>
                    <span className="extra-copy-request-time">
                      {r.created_at ? new Date(r.created_at).toLocaleString('de-DE') : ''}
                    </span>
                  </div>
                  <div className="extra-copy-request-actions">
                    <button
                      type="button"
                      className="btn btn--primary btn--small"
                      disabled={loading}
                      onClick={() => onApprove(r.id)}
                    >
                      Genehmigen
                    </button>
                    <button
                      type="button"
                      className="btn btn--secondary btn--small"
                      disabled={loading}
                      onClick={() => onReject(r.id)}
                    >
                      Ablehnen
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="imeis-history-modal-footer">
          <button onClick={onClose} className="btn btn--primary btn--small">
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExtraCopyRequestsModal;
