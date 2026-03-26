import './NewsPopup.scss';

/** Anzeige immer gleich, unabhängig davon, welcher Administrator die Anweisung speichert. */
const NEWS_POPUP_TITLE = 'Neue Nachricht von Akram Zalloom';

const NewsPopup = ({ content, onMarkAsRead }) => {
  if (!content || !content.trim()) return null;

  return (
    <div className="news-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="news-popup-title">
      <div className="news-popup">
        <h2 id="news-popup-title" className="news-popup-title">
          {NEWS_POPUP_TITLE}
        </h2>
        <div
          className="news-popup-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />
        <button
          type="button"
          className="news-popup-btn"
          onClick={onMarkAsRead}
        >
          Gelesen und verstanden
        </button>
      </div>
    </div>
  );
};

export default NewsPopup;
