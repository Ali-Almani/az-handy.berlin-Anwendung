import { useState, useEffect, useId } from 'react';
import { useAuth } from '../../hooks/useAuth';
import PerformanceDashboard from '../../components/PerformanceDashboard/PerformanceDashboard';
import { isAdmin } from '../../utils/roles';
import { getSiteNews } from '../../services/dashboard.service';
import { getSocket } from '../../services/socket';
import Login from '../Auth/Login';
import './Home.scss';

const siteNewsSeenKey = (userId) => `siteNewsLastSeen:${userId}`;

const Home = () => {
  const { user } = useAuth();
  const panelId = useId();
  const [metricsMeta, setMetricsMeta] = useState(null);
  const [siteNewsHtml, setSiteNewsHtml] = useState('');
  const [siteNewsUpdatedAt, setSiteNewsUpdatedAt] = useState(null);
  const [siteNewsLoading, setSiteNewsLoading] = useState(true);
  /** Accordion: true = Panel geöffnet */
  const [newsOpen, setNewsOpen] = useState(false);
  /** Server-News ist für diesen Nutzer noch „ungelesen“ (anderes updatedAt als zuletzt gesehen) */
  const [newsIsUnread, setNewsIsUnread] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const loadNews = async () => {
      try {
        setSiteNewsLoading(true);
        const res = await getSiteNews();
        const content = res.data?.content ?? '';
        const updatedAt = res.data?.updatedAt ?? '';
        setSiteNewsHtml(content);
        setSiteNewsUpdatedAt(updatedAt || null);

        const plain = String(content).replace(/<[^>]+>/g, '').trim();
        const hasText = plain.length > 0;
        if (hasText && updatedAt) {
          const lastSeen = localStorage.getItem(siteNewsSeenKey(user.id));
          const read = lastSeen === updatedAt;
          setNewsIsUnread(!read);
          setNewsOpen(read);
        } else {
          setNewsIsUnread(false);
          setNewsOpen(true);
        }
      } catch {
        setSiteNewsHtml('');
        setSiteNewsUpdatedAt(null);
        setNewsIsUnread(false);
        setNewsOpen(true);
      } finally {
        setSiteNewsLoading(false);
      }
    };

    loadNews();

    const socket = getSocket();
    const onSiteNews = () => loadNews();
    if (socket) socket.on('siteNews:updated', onSiteNews);
    return () => {
      if (socket) socket.off('siteNews:updated', onSiteNews);
    };
  }, [user?.id]);

  if (!user) {
    return <Login />;
  }

  const hasNews = siteNewsHtml && String(siteNewsHtml).replace(/<[^>]+>/g, '').trim().length > 0;

  const handleNewsAccordionToggle = () => {
    const next = !newsOpen;
    if (next && user?.id && siteNewsUpdatedAt && newsIsUnread) {
      try {
        localStorage.setItem(siteNewsSeenKey(user.id), siteNewsUpdatedAt);
        setNewsIsUnread(false);
      } catch {
        /* ignore */
      }
    }
    setNewsOpen(next);
  };

  return (
    <div className="home">
      <div className="card home__kennzahlen">
        <div className="card-header card-header--kennzahlen">
          <h2 className="card-title">Kennzahlen</h2>
          <div className="card-header__meta">
            <span className="card-header__meta-item">
              <strong>Stand der Daten</strong> {metricsMeta?.dataStatus ?? '–'}
            </span>
            <span className="card-header__meta-item">
              <strong>Resttage im Monat</strong> {metricsMeta?.resttage ?? metricsMeta?.workingDays ?? '–'}
            </span>
          </div>
        </div>
        <div className="card-body">
          <PerformanceDashboard
            isAdmin={isAdmin(user)}
            readOnly
            metaInHeader
            onMetricsLoaded={setMetricsMeta}
          />
        </div>
      </div>

      <div className="card home__news home__news-accordion">
        {siteNewsLoading ? (
          <div className="home__news-loading-wrap">
            <p className="home__news-loading">Lade NEWS…</p>
          </div>
        ) : !hasNews ? (
          <div className="home__news-empty-wrap">
            <p className="home__news-empty text-muted">Aktuell keine NEWS.</p>
          </div>
        ) : (
          <div className="home__news-card">
            <button
              type="button"
              id="home-news-accordion-trigger"
              className={`home__news-accordion-trigger${newsOpen ? ' is-open' : ''}`}
              aria-expanded={newsOpen}
              aria-controls={panelId}
              onClick={handleNewsAccordionToggle}
            >
              <span className="home__news-accordion-sub">
                {newsOpen ? 'Einklappen' : newsIsUnread ? 'Zum Lesen aufklappen' : 'Aufklappen'}
              </span>
              {newsIsUnread && (
                <span className="home__news-accordion-badge">Neue Nachricht</span>
              )}
              <span className="home__news-accordion-trigger-main">
                <span className="home__news-accordion-title">NEWS</span>
              </span>
              <span className="home__news-accordion-chevron" aria-hidden />
            </button>

            <div
              id={panelId}
              role="region"
              aria-labelledby="home-news-accordion-trigger"
              className={`home__news-accordion-panel${newsOpen ? ' is-open' : ''}`}
              aria-hidden={!newsOpen}
            >
              <div
                className="home__news-content home__news-body saved-text-content"
                dangerouslySetInnerHTML={{ __html: siteNewsHtml }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
