import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getSiteNewsHistory } from '../../services/dashboard.service';
import { getSocket } from '../../services/socket';
import { isAdmin } from '../../utils/roles';
import './ArchivNews.scss';

const ArchivNews = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || isAdmin(user)) return;
    const fetchHistory = async (isInitial = true) => {
      try {
        if (isInitial) setLoading(true);
        const res = await getSiteNewsHistory();
        setEntries(res.data?.entries ?? []);
      } catch {
        setEntries([]);
      } finally {
        if (isInitial) setLoading(false);
      }
    };
    fetchHistory(true);
    const id = setInterval(() => fetchHistory(false), 30000);
    const socket = getSocket();
    const onUpdated = () => fetchHistory(false);
    if (socket) socket.on('siteNews:updated', onUpdated);
    return () => {
      clearInterval(id);
      if (socket) socket.off('siteNews:updated', onUpdated);
    };
  }, [user?.id, user?.role]);

  if (!user) return null;
  if (isAdmin(user)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="archiv-news-page">
      <div className="card archiv-news-card">
        <div className="card-header">
          <h2 className="card-title">Archiv NEWS</h2>
          <p className="archiv-news-intro">
            Frühere Startseiten-NEWS zur Einsicht (nur Lesen).
          </p>
        </div>
        <div className="card-body">
          {loading ? (
            <p>Lade Archiv…</p>
          ) : entries.length === 0 ? (
            <p className="archiv-news-empty">Noch keine archivierten NEWS.</p>
          ) : (
            <ul className="archiv-news-list">
              {entries.map((entry) => (
                <li key={entry.id} className="archiv-news-item">
                  <div
                    className="archiv-news-content"
                    dangerouslySetInnerHTML={{ __html: entry.content || '' }}
                  />
                  {entry.updatedAt && (
                    <div className="archiv-news-date">
                      Stand:{' '}
                      {new Date(entry.updatedAt).toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArchivNews;
