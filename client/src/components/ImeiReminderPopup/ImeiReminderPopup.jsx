import './ImeiReminderPopup.scss';

const ImeiReminderPopup = ({ reminder, onMarkAsRead }) => {
  if (!reminder) return null;

  return (
    <div className="imei-reminder-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="imei-reminder-title">
      <div className="imei-reminder-popup">
        <h2 id="imei-reminder-title" className="imei-reminder-popup-title">
          {reminder.from_user_name ? `Erinnerung von ${reminder.from_user_name}` : 'Erinnerung'}
        </h2>
        <div className="imei-reminder-popup-content">
          {reminder.message}
        </div>
        <button
          type="button"
          className="imei-reminder-popup-btn"
          onClick={onMarkAsRead}
        >
          Gelesen und verstanden
        </button>
      </div>
    </div>
  );
};

export default ImeiReminderPopup;
