import { useEffect, useState, useId, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getSiteNewsHistory } from '../../services/dashboard.service';
import { getSocket } from '../../services/socket';
import Login from '../Auth/Login';
import './ArchivNews.scss';

const formatStand = (iso) => {
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
    return String(iso);
  }
};

const ArchivNewsEntry = ({ entry, idBase, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen);
  const triggerId = `${idBase}-trigger-${entry.id}`;
  const panelId = `${idBase}-panel-${entry.id}`;
  const dateStr = formatStand(entry.updatedAt);
  const hasBody =
    entry.content && String(entry.content).replace(/<[^>]+>/g, '').trim().length > 0;

  return (
    <div className="card archiv-news-entry-card">
      <button
        type="button"
        id={triggerId}
        className={`archiv-news-accordion-trigger${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="archiv-news-accordion-row-primary">
          <span className="archiv-news-accordion-icon-news" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
              />
              <path d="M8 8h8M8 12h6M8 16h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </span>
          <span className="archiv-news-accordion-trigger-main">
            <span className="archiv-news-accordion-title">NEWS</span>
            {dateStr ? (
              <span className="archiv-news-accordion-date-pill">Stand: {dateStr}</span>
            ) : null}
          </span>
          <span className="archiv-news-accordion-chevron" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
        <span className="archiv-news-accordion-sub">
          <span className="archiv-news-accordion-sub-icon" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="archiv-news-accordion-sub-label">{open ? 'Einklappen' : 'Aufklappen'}</span>
        </span>
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        className={`archiv-news-accordion-panel${open ? ' is-open' : ''}`}
        aria-hidden={!open}
      >
        {hasBody ? (
          <div
            className="archiv-news-body saved-text-content"
            dangerouslySetInnerHTML={{ __html: entry.content || '' }}
          />
        ) : (
          <p className="archiv-news-body archiv-news-body--empty text-muted">Kein Inhalt für diesen Stand.</p>
        )}
      </div>
    </div>
  );
};

const ArchivNews = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const idBase = useId();

  const fetchHistory = useCallback(async (isInitial = true) => {
    if (!user?.id) return;
    try {
      if (isInitial) setLoading(true);
      const res = await getSiteNewsHistory();
      setEntries(res.data?.entries ?? []);
    } catch {
      setEntries([]);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    fetchHistory(true);
    const pollId = setInterval(() => fetchHistory(false), 30000);
    const socket = getSocket();
    const onUpdated = () => fetchHistory(false);
    if (socket) {
      socket.on('siteNews:updated', onUpdated);
      socket.on('siteNewsHistory:updated', onUpdated);
    }
    return () => {
      clearInterval(pollId);
      if (socket) {
        socket.off('siteNews:updated', onUpdated);
        socket.off('siteNewsHistory:updated', onUpdated);
      }
    };
  }, [user?.id, fetchHistory]);

  if (!user) {
    return <Login />;
  }

  return (
    <div className="archiv-news-page">
      <header className="archiv-news-page__intro">
        <h1 className="archiv-news-page__title">Archiv NEWS</h1>
        <p className="archiv-news-page__subtitle">
          Frühere Startseiten-NEWS – Darstellung wie auf der Startseite (
          <a href="https://az-schnelltest.berlin/" target="_blank" rel="noopener noreferrer">
            az-schnelltest.berlin
          </a>
          ).
        </p>
      </header>

      <div className="archiv-news-feed">
        {loading ? (
          <div className="archiv-news-loading-wrap">
            <p className="archiv-news-loading">Lade Archiv…</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="card archiv-news-empty-card">
            <div className="card-body">
              <p className="archiv-news-empty">Noch keine archivierten NEWS.</p>
            </div>
          </div>
        ) : (
          entries.map((entry, index) => (
            <ArchivNewsEntry
              key={entry.id || entry.updatedAt || index}
              entry={entry}
              idBase={idBase}
              defaultOpen={index === 0}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ArchivNews;
