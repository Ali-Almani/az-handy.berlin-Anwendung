import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDashboardNote, saveDashboardNote, getNewsReaders } from '../../services/dashboard.service';
import { canAccessDashboard, canShowExcelUpload, canShowDashboardNotes } from '../../utils/roles';
import { isAdmin } from '../../utils/roles';
import TextEditor from '../../components/TextEditor/TextEditor';
import ExcelUpload from '../../components/ExcelUpload/ExcelUpload';
import './Dashboard.scss';

const Dashboard = () => {
  const { user } = useAuth();
  const [noteContent, setNoteContent] = useState('');
  const [noteLoading, setNoteLoading] = useState(true);
  const [noteError, setNoteError] = useState(null);
  const [readers, setReaders] = useState([]);

  useEffect(() => {
    if (!user?.id || !canShowDashboardNotes(user)) return;
    const fetchNote = async () => {
      try {
        setNoteLoading(true);
        setNoteError(null);
        const response = await getDashboardNote();
        setNoteContent(response.data?.content ?? '');
      } catch (error) {
        console.error('Error fetching note:', error);
        setNoteError('Notiz konnte nicht geladen werden.');
      } finally {
        setNoteLoading(false);
      }
    };
    fetchNote();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !isAdmin(user)) return;
    const fetchReaders = async () => {
      try {
        const res = await getNewsReaders();
        setReaders(res.data?.readers ?? []);
      } catch {}
    };
    fetchReaders();
    const id = setInterval(fetchReaders, 60000);
    return () => clearInterval(id);
  }, [user?.id]);

  if (!canAccessDashboard(user)) {
    return <Navigate to="/" replace />;
  }

  const handleSave = async (content) => {
    try {
      await saveDashboardNote(content);
      setNoteContent(content);
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  return (
    <div className="dashboard">
      {canShowDashboardNotes(user) && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Willkommen, {user?.name}</h2>
          </div>
          <div className="card-body">
            {noteError && <p className="text-error">{noteError}</p>}
            {noteLoading ? (
              <p>Lade Notizen...</p>
            ) : (
              <TextEditor
                initialContent={noteContent}
                onSave={handleSave}
                placeholder="Schreiben Sie hier Ihre Notizen oder Gedanken..."
              />
            )}
          </div>
        </div>
      )}

      {isAdmin(user) && readers.length > 0 && (
        <div className="card dashboard-readers">
          <div className="card-header">
            <h2 className="card-title">News gelesen von</h2>
          </div>
          <div className="card-body">
            <ul className="dashboard-readers-list">
              {readers.map((r, i) => (
                <li key={i}>
                  <strong>{r.userName}</strong> – {new Date(r.readAt).toLocaleString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {canShowExcelUpload(user) && <ExcelUpload />}
    </div>
  );
};

export default Dashboard;
