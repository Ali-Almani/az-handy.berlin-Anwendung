import { Link } from 'react-router-dom';
import './AuditLogCriticalModal.scss';

const ACTION_LABELS = {
  'login.failed': 'Fehlgeschlagener Login',
  'user.delete': 'Benutzer gelöscht',
  'user.password.reset': 'Passwort zurückgesetzt',
  'imei.delete_all': 'Alle IMEIs gelöscht',
  'imei.accepted_archive.delete': 'Angenommen-Archiv gelöscht',
  'vorvertrag.delete': 'Vorvertrag/MNP gelöscht'
};

function formatTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return iso;
  }
}

const AuditLogCriticalModal = ({ isOpen, onClose, notifications, onMarkAsRead }) => {
  if (!isOpen || !notifications?.length) return null;

  const latest = notifications[0];
  const title = ACTION_LABELS[latest?.action] || 'Kritisches Audit-Event';

  const handleClose = async () => {
    if (latest?.id) await onMarkAsRead?.(latest.id);
    onClose?.();
  };

  return (
    <div className="audit-log-critical-overlay" onClick={handleClose}>
      <div className="audit-log-critical-modal" onClick={(e) => e.stopPropagation()}>
        <div className="audit-log-critical-header">
          <h3>{title}</h3>
          <button type="button" onClick={handleClose} className="audit-log-critical-close" aria-label="Schließen">
            ×
          </button>
        </div>
        <div className="audit-log-critical-body">
          <p className="audit-log-critical-summary">{latest?.summary}</p>
          {latest?.userName ? (
            <p className="audit-log-critical-meta">
              Benutzer: {latest.userName}
              {latest.userRole ? ` (${latest.userRole})` : ''}
            </p>
          ) : null}
          {latest?.timestamp ? (
            <p className="audit-log-critical-meta">{formatTime(latest.timestamp)}</p>
          ) : null}
          {notifications.length > 1 ? (
            <p className="audit-log-critical-more">
              + {notifications.length - 1} weitere ungelesene Benachrichtigung{notifications.length - 1 === 1 ? '' : 'en'}
            </p>
          ) : null}
        </div>
        <div className="audit-log-critical-footer">
          <Link to="/logs" className="btn btn--secondary btn--small" onClick={handleClose}>
            Zum Audit-Log
          </Link>
          <button type="button" onClick={handleClose} className="btn btn--primary btn--small">
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditLogCriticalModal;
