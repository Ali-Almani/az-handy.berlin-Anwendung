import './ReminderResponseNotificationModal.scss';

const ReminderResponseNotificationModal = ({ isOpen, onClose, notifications, onMarkAsRead }) => {
  if (!isOpen || !notifications?.length) return null;

  const latest = notifications[0];
  const isAngenommen = latest?.action === 'angenommen';

  const handleClose = async () => {
    if (latest?.id) await onMarkAsRead?.(latest.id);
    onClose?.();
  };

  return (
    <div className="reminder-response-notification-overlay" onClick={handleClose}>
      <div className="reminder-response-notification-modal" onClick={(e) => e.stopPropagation()}>
        <div className="reminder-response-notification-header">
          <h3>
            {isAngenommen ? '✓ Erinnerung beantwortet' : 'Erinnerung beantwortet'}
          </h3>
          <button onClick={handleClose} className="reminder-response-notification-close" aria-label="Schließen">
            ×
          </button>
        </div>
        <div className="reminder-response-notification-body">
          <p className={isAngenommen ? 'reminder-response-notification-success' : 'reminder-response-notification-rejected'}>
            {latest?.message || 'Ein Benutzer hat auf deine Erinnerung reagiert.'}
          </p>
        </div>
        <div className="reminder-response-notification-footer">
          <button onClick={handleClose} className="btn btn--primary btn--small">
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReminderResponseNotificationModal;
