import { sanitizeRichTextHtml } from '../../utils/sanitizeRichTextHtml';
import './NewsPopup.scss';

const NewsPopup = ({ content, authorName, onMarkAsRead }) => {
  if (!content || !content.trim()) return null;
  const safe = sanitizeRichTextHtml(content);
  if (!safe.trim()) return null;

  return (
    <div className="news-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="news-popup-title">
      <div className="news-popup">
        <h2 id="news-popup-title" className="news-popup-title">
          {authorName ? `Neue Nachricht von ${authorName}` : 'Neue Nachricht'}
        </h2>
        <div
          className="news-popup-content"
          dangerouslySetInnerHTML={{ __html: safe }}
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
