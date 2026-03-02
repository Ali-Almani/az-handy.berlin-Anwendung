import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getUserProfile, updateUserProfile, updatePassword, restoreAdmin } from '../../services/user.service';
import { isAdmin } from '../../utils/roles';
import UserManagement from '../../components/UserManagement/UserManagement';
import ProfileForm from './components/ProfileForm';
import PasswordForm from './components/PasswordForm';
import './Settings.scss';

const Settings = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', avatar: null, avatarPreview: null });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      try {
        const response = await getUserProfile();
        const userData = response.data.user;
        setFormData({ name: userData.name || '', email: userData.email || '', avatar: null, avatarPreview: userData.avatar || null });
      } catch {
        setError('Profil konnte nicht geladen werden');
      }
    };
    loadProfile();
  }, [user]);

  const clearMessages = () => { setError(''); setSuccess(''); };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    clearMessages();
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Bitte wählen Sie eine Bilddatei aus'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Bild darf maximal 5MB groß sein'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setFormData(prev => ({ ...prev, avatar: file, avatarPreview: reader.result }));
    reader.readAsDataURL(file);
    setError('');
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    clearMessages();
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();
    try {
      const updateData = { name: formData.name, email: formData.email };
      if (formData.avatar) updateData.avatar = formData.avatarPreview;
      const response = await updateUserProfile(updateData);
      setUser(response.data.user);
      setSuccess('Profil erfolgreich aktualisiert!');
      setFormData(prev => ({ ...prev, avatar: null }));
    } catch (err) {
      setError(err.response?.data?.message || 'Fehler beim Aktualisieren des Profils');
    } finally {
      setLoading(false);
    }
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
        <p>Verwalten Sie Ihre Kontoeinstellungen</p>
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
        <div className="settings-section">
          <div className="settings-section-header">
            <h2>Profil bearbeiten</h2>
            <p>Ändern Sie Ihren Namen, E-Mail und Avatar</p>
          </div>
          <ProfileForm formData={formData} loading={loading} onInputChange={handleInputChange} onAvatarChange={handleAvatarChange} onSubmit={handleProfileSubmit} />
        </div>
        <div className="settings-section">
          <div className="settings-section-header">
            <h2>Passwort ändern</h2>
            <p>Ändern Sie Ihr Passwort für mehr Sicherheit</p>
          </div>
          <PasswordForm passwordData={passwordData} loading={loading} onChange={handlePasswordChange} onSubmit={handlePasswordSubmit} />
        </div>
        {isAdmin(user) && (
          <div className="settings-section">
            <UserManagement />
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
