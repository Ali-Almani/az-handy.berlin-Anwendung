import './ExtraCopyNotificationModal.scss';

const ExtraCopyNotificationModal = ({ isOpen, onClose, notifications, onMarkAsRead }) => {
  if (!isOpen || !notifications?.length) return null;

  const latest = notifications[0];
  const isApproved = latest?.status === 'approved';

  const handleClose = async () => {
    if (latest?.id) await onMarkAsRead?.(latest.id);
    onClose?.();
  };

  return (
    <div className="extra-copy-notification-overlay" onClick={handleClose}>
      <div className="extra-copy-notification-modal" onClick={(e) => e.stopPropagation()}>
        <div className="extra-copy-notification-header">
          <h3>
            {isApproved ? '✓ Genehmigt' : 'Anfrage abgelehnt'}
          </h3>
          <button onClick={handleClose} className="extra-copy-notification-close" aria-label="Schließen">
            ×
          </button>
        </div>
        <div className="extra-copy-notification-body">
          <p className={isApproved ? 'extra-copy-notification-success' : 'extra-copy-notification-rejected'}>
            {latest?.message || (isApproved ? 'Ihre Anfrage für eine Extra-Kopie wurde genehmigt.' : 'Ihre Anfrage wurde abgelehnt.')}
          </p>
        </div>
        <div className="extra-copy-notification-footer">
          <button onClick={handleClose} className="btn btn--primary btn--small">
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExtraCopyNotificationModal;
