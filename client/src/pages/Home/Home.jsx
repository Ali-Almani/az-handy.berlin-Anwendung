import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import PerformanceDashboard from '../../components/PerformanceDashboard/PerformanceDashboard';
import { isAdmin } from '../../utils/roles';
import { getSiteNews } from '../../services/dashboard.service';
import { getSocket } from '../../services/socket';
import Login from '../Auth/Login';
import { sanitizeRichTextHtml } from '../../utils/sanitizeRichTextHtml';
import './Home.scss';

const Home = () => {
  const { user } = useAuth();
  const [metricsMeta, setMetricsMeta] = useState(null);
  const [siteNewsHtml, setSiteNewsHtml] = useState('');
  const [siteNewsLoading, setSiteNewsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const loadNews = async () => {
      try {
        setSiteNewsLoading(true);
        const res = await getSiteNews();
        setSiteNewsHtml(res.data?.content ?? '');
      } catch {
        setSiteNewsHtml('');
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

  // Startseite: Login-Form anzeigen wenn nicht eingeloggt
  if (!user) {
    return <Login />;
  }

  const newsSafe = sanitizeRichTextHtml(siteNewsHtml);
  const hasNews = newsSafe && String(newsSafe).replace(/<[^>]+>/g, '').trim().length > 0;

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

      <div className="card home__news">
        <div className="card-header home__news-header">
          <h2 className="card-title">NEWS</h2>
        </div>
        <div className="card-body home__news-body">
          {siteNewsLoading ? (
            <p className="home__news-loading">Lade NEWS…</p>
          ) : hasNews ? (
            <div
              className="home__news-content saved-text-content"
              dangerouslySetInnerHTML={{ __html: newsSafe }}
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
