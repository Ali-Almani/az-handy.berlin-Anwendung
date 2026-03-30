import '../ExtraCopyRequestsModal/ExtraCopyRequestsModal.scss';
import './VoucherManualRequestsModal.scss';

const VoucherManualRequestsModal = ({ isOpen, onClose, requests, loading, onApprove, onReject }) => {
  if (!isOpen) return null;

  return (
    <div className="imeis-history-modal-overlay" onClick={onClose}>
      <div
        className="imeis-history-modal extra-copy-requests-modal voucher-manual-requests-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', width: '92%' }}
      >
        <div className="imeis-history-modal-header">
          <h3>Voucher anfrage</h3>
          <button type="button" onClick={onClose} className="imeis-history-modal-close" aria-label="Schließen">
            ×
          </button>
        </div>
        <div className="imeis-history-modal-body">
          {requests.length === 0 ? (
            <p style={{ color: '#666', margin: 0 }}>Keine offenen Anfragen.</p>
          ) : (
            <ul className="voucher-manual-requests-list">
              {requests.map((r) => (
                <li key={r.id} className="voucher-manual-request-item">
                  <div className="voucher-manual-request-info">
                    <strong>{r.requester_user_name || 'Unbekannt'}</strong>
                    <span className="voucher-manual-request-meta">{r.voucher_art_label}</span>
                    <span className="voucher-manual-request-nummer">Nummer: {r.nummer}</span>
                    <span className="voucher-manual-request-time">
                      {r.created_at ? new Date(r.created_at).toLocaleString('de-DE') : ''}
                    </span>
                  </div>
                  <div className="voucher-manual-request-actions">
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
          <button type="button" onClick={onClose} className="btn btn--primary btn--small">
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoucherManualRequestsModal;
