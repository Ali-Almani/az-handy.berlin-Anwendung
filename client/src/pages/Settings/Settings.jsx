import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { updatePassword, restoreAdmin } from '../../services/user.service';
import { isAdmin } from '../../utils/roles';
import PasswordForm from './components/PasswordForm';
import './Settings.scss';

const Settings = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    clearMessages();
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

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();
    if (passwordData.newPassword.length < 6) {
      setError('Das neue Passwort muss mindestens 6 Zeichen lang sein');
      setLoading(false);
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Die Passwörter stimmen nicht überein');
      setLoading(false);
      return;
    }
    try {
      await updatePassword({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword });
      setSuccess('Passwort erfolgreich geändert!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Fehler beim Ändern des Passworts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <h1>Einstellungen</h1>
        <p>Passwort und Kontosicherheit.</p>
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
      <div className="settings-content">
        <div className="settings-section settings-section--password">
          <div className="settings-section-header">
            <h2>Passwort ändern</h2>
            <p>Ändern Sie Ihr Passwort für mehr Sicherheit</p>
          </div>
          <PasswordForm passwordData={passwordData} loading={loading} onChange={handlePasswordChange} onSubmit={handlePasswordSubmit} />
        </div>
      </div>
    </div>
  );
};

export default Settings;
