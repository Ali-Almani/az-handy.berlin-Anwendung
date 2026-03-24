import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import PerformanceDashboard from '../../components/PerformanceDashboard/PerformanceDashboard';
import { isAdmin } from '../../utils/roles';
import { getSiteNews } from '../../services/dashboard.service';
import { getSocket } from '../../services/socket';
import Login from '../Auth/Login';
import './Home.scss';

const siteNewsSeenKey = (userId) => `siteNewsLastSeen:${userId}`;
const siteNewsStickyKey = (userId) => `siteNewsStickyPref:${userId}`;

const readStickyPref = (userId) => {
  try {
    const v = localStorage.getItem(siteNewsStickyKey(userId));
    if (v === null) return true;
    return v === '1' || v === 'true';
  } catch {
    return true;
  }
};

const Home = () => {
  const { user } = useAuth();
  const [metricsMeta, setMetricsMeta] = useState(null);
  const [siteNewsHtml, setSiteNewsHtml] = useState('');
  const [siteNewsUpdatedAt, setSiteNewsUpdatedAt] = useState(null);
  const [siteNewsLoading, setSiteNewsLoading] = useState(true);
  /** false = nur Teaser „neue Nachricht“, true = voller Inhalt */
  const [siteNewsRevealed, setSiteNewsRevealed] = useState(false);
  /** NEWS-Karte beim Scrollen anheften (nur sinnvoll nach „gelesen“) */
  const [newsStickyEnabled, setNewsStickyEnabled] = useState(true);

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
          setSiteNewsRevealed(lastSeen === updatedAt);
        } else {
          setSiteNewsRevealed(true);
        }
      } catch {
        setSiteNewsHtml('');
        setSiteNewsUpdatedAt(null);
        setSiteNewsRevealed(true);
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

  useEffect(() => {
    if (!user?.id) return;
    setNewsStickyEnabled(readStickyPref(user.id));
  }, [user?.id]);

  // Startseite: Login-Form anzeigen wenn nicht eingeloggt
  if (!user) {
    return <Login />;
  }

  const hasNews = siteNewsHtml && String(siteNewsHtml).replace(/<[^>]+>/g, '').trim().length > 0;

  const handleOpenSiteNews = () => {
    if (user?.id && siteNewsUpdatedAt) {
      try {
        localStorage.setItem(siteNewsSeenKey(user.id), siteNewsUpdatedAt);
      } catch {
        /* ignore */
      }
    }
    setSiteNewsRevealed(true);
  };

  const handleNewsStickyChange = (e) => {
    const on = e.target.checked;
    setNewsStickyEnabled(on);
    if (user?.id) {
      try {
        localStorage.setItem(siteNewsStickyKey(user.id), on ? '1' : '0');
      } catch {
        /* ignore */
      }
    }
  };

  const showNewsSticky =
    hasNews && siteNewsRevealed && newsStickyEnabled;

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

      <div
        className={`card home__news${showNewsSticky ? ' home__news--sticky' : ''}`}
      >
        <div className="card-header home__news-header">
          <h2 className="card-title">NEWS</h2>
          {hasNews && siteNewsRevealed && (
            <label className="home__news-sticky-label">
              <input
                type="checkbox"
                className="home__news-sticky-checkbox"
                checked={newsStickyEnabled}
                onChange={handleNewsStickyChange}
              />
              <span>Beim Scrollen anheften</span>
            </label>
          )}
        </div>
        <div className="card-body home__news-body">
          {siteNewsLoading ? (
            <p className="home__news-loading">Lade NEWS…</p>
          ) : hasNews && !siteNewsRevealed ? (
            <button
              type="button"
              className="home__news-teaser"
              onClick={handleOpenSiteNews}
            >
              <span className="home__news-teaser-title">Sie haben eine neue Nachricht</span>
              <span className="home__news-teaser-hint">Hier klicken, um die NEWS zu öffnen.</span>
            </button>
          ) : hasNews ? (
            <div
              className="home__news-content saved-text-content"
              dangerouslySetInnerHTML={{ __html: siteNewsHtml }}
            />
          ) : (
            <p className="home__news-empty text-muted">Aktuell keine NEWS.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
