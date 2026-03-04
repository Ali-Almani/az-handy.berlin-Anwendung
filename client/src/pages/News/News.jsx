import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getNewsArchive } from '../../services/dashboard.service';
import { isAdmin } from '../../utils/roles';
import './News.scss';

const News = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetchNews = async () => {
      try {
        setLoading(true);
        const res = await getNewsArchive();
        setMessages(res.data?.messages ?? []);
      } catch {
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, [user?.id]);

  if (isAdmin(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="news-page">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">News</h2>
        </div>
        <div className="card-body">
          {loading ? (
            <p>Lade Nachrichten...</p>
          ) : messages.length === 0 ? (
            <p className="news-empty">Keine Nachrichten vorhanden.</p>
          ) : (
            <ul className="news-list">
              {messages.map((m) => (
                <li key={m.id} className="news-item">
                  <div
                    className="news-content"
                    dangerouslySetInnerHTML={{ __html: m.content || '' }}
                  />
                  {m.createdAt && (
                    <div className="news-date">
                      {new Date(m.createdAt).toLocaleString('de-DE', {
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

export default News;
