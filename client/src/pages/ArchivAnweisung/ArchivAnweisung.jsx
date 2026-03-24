import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getNewsArchive } from '../../services/dashboard.service';
import { getSocket } from '../../services/socket';
import { sanitizeRichTextHtml } from '../../utils/sanitizeRichTextHtml';
import './ArchivAnweisung.scss';

const ArchivAnweisung = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetchArchive = async (isInitial = true) => {
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
    fetchArchive(true);
    const id = setInterval(() => fetchArchive(false), 30000);
    const socket = getSocket();
    const onNewsNew = () => fetchArchive(false);
    if (socket) socket.on('news:new', onNewsNew);
    return () => {
      clearInterval(id);
      if (socket) socket.off('news:new', onNewsNew);
    };
  }, [user?.id]);

  return (
    <div className="archiv-anweisung-page">
      <div className="card archiv-anweisung-card">
        <div className="card-header">
          <h2 className="card-title">Archiv Anweisung</h2>
        </div>
        <div className="card-body">
          {loading ? (
            <p>Lade Archiv...</p>
          ) : messages.length === 0 ? (
            <p className="archiv-anweisung-empty">Keine vergangenen Anweisungen.</p>
          ) : (
            <ul className="archiv-anweisung-list">
              {messages.map((m) => (
                <li key={m.id} className="archiv-anweisung-item">
                  <div
                    className="archiv-anweisung-content"
                    dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(m.content || '') }}
                  />
                  {m.createdAt && (
                    <div className="archiv-anweisung-date">
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
                    <div className="archiv-anweisung-edited">
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

export default ArchivAnweisung;
