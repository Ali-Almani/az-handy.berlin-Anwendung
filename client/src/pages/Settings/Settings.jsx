import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { restoreAdmin } from '../../services/user.service';
import { isAdmin } from '../../utils/roles';
import './Settings.scss';

const Settings = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleRestoreAdmin = async () => {
    setLoading(true);
    clearMessages();
    try {
      const response = await restoreAdmin();
      setUser(response.data.user);
      setSuccess('Admin-Rolle wiederhergestellt!');
    } catch (err) {
      setError(err.response?.data?.message || 'Fehler beim Wiederherstellen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <h1>Einstellungen</h1>
        <p>Profilbild, Name, Einsatzort und Telefon bearbeiten Sie im Mitarbeiterprofil (Benutzermenü).</p>
      </div>
      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}
      {user?.email?.toLowerCase() === 'admin@az-handy.berlin' && !isAdmin(user) && (
        <div className="alert alert--warning settings-restore-admin">
          <span>Ihre Admin-Rechte wurden zurückgesetzt.</span>
          <button type="button" className="btn btn--primary btn--small" onClick={handleRestoreAdmin} disabled={loading}>
            Admin-Rolle wiederherstellen
          </button>
        </div>
      )}
    </div>
  );
};

export default Settings;
