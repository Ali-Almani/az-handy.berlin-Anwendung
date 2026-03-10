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
    const fetchNews = async (isInitial = true) => {
      try {
        if (isInitial) setLoading(true);
        const res = await getNewsArchive();
        setMessages(res.data?.messages ?? []);
      } catch {
        setMessages([]);
      } finally {
        if (isInitial) setLoading(false);
      }
    };
    fetchNews(true);
    const id = setInterval(() => fetchNews(false), 3000);
    return () => clearInterval(id);
  }, [user?.id]);

  if (isAdmin(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="news-page">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Archive Anweisung</h2>
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
                      Erstellt: {new Date(m.createdAt).toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                  {m.updatedAt && (
                    <div className="news-date news-date-edited">
                      Bearbeitet am {new Date(m.updatedAt).toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {m.updatedBy && ` von ${m.updatedBy}`}
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
