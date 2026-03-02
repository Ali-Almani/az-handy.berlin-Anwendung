import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getDashboardNote, saveDashboardNote } from '../../services/dashboard.service';
import { isAdmin } from '../../utils/roles';
import TextEditor from '../../components/TextEditor/TextEditor';
import ExcelUpload from '../../components/ExcelUpload/ExcelUpload';
import './Dashboard.scss';

const Dashboard = () => {
  const { user } = useAuth();
  const [noteContent, setNoteContent] = useState('');
  const [noteLoading, setNoteLoading] = useState(true);
  const [noteError, setNoteError] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
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

      {isAdmin(user) && <ExcelUpload />}
    </div>
  );
};

export default Dashboard;
