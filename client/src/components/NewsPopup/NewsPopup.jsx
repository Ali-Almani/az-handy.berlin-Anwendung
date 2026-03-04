import './NewsPopup.scss';

const NewsPopup = ({ content, onMarkAsRead }) => {
  if (!content || !content.trim()) return null;

  return (
    <div className="news-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="news-popup-title">
      <div className="news-popup">
        <h2 id="news-popup-title" className="news-popup-title">Neue Nachricht</h2>
        <div
          className="news-popup-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />
        <button
          type="button"
          className="news-popup-btn"
          onClick={onMarkAsRead}
        >
          Gelesen
        </button>
      </div>
    </div>
  );
};

export default NewsPopup;
