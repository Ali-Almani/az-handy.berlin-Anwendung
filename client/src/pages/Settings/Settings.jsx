import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { updatePassword, restoreAdmin, updateUserProfile } from '../../services/user.service';
import { isAdmin, isMitarbeiterShop, TSHIRT_GROESSE_OPTIONS } from '../../utils/roles';
import PasswordForm from './components/PasswordForm';
import OwnProfileForm from '../../components/Profile/OwnProfileForm';
import './Settings.scss';

const Settings = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [tshirtGroesse, setTshirtGroesse] = useState('');
  const [tshirtSaving, setTshirtSaving] = useState(false);
  const [tshirtError, setTshirtError] = useState('');
  const [tshirtSuccess, setTshirtSuccess] = useState('');

  useEffect(() => {
    if (user && isMitarbeiterShop(user)) {
      setTshirtGroesse(user.tshirt_groesse ? String(user.tshirt_groesse) : '');
    }
  }, [user?.id, user?.tshirt_groesse]);

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

  const handleTshirtSubmit = async (e) => {
    e.preventDefault();
    if (!user || !isMitarbeiterShop(user)) return;
    setTshirtSaving(true);
    setTshirtError('');
    setTshirtSuccess('');
    try {
      const payload = { tshirt_groesse: tshirtGroesse.trim() || null };
      const res = await updateUserProfile(payload);
      setUser(res.data.user);
      setTshirtSuccess('Uniform-Größe gespeichert.');
    } catch (err) {
      setTshirtError(err.response?.data?.message || 'Speichern fehlgeschlagen.');
    } finally {
      setTshirtSaving(false);
    }
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <h1>Einstellungen</h1>
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
        <div className="settings-section settings-section--profile">
          <div className="settings-section-header">
            <h2>Mitarbeiterprofil</h2>
            <p>Name, Einsatzort, Telefon und Profilbild bearbeiten</p>
          </div>
          <OwnProfileForm user={user} setUser={setUser} />
        </div>
        {user && isMitarbeiterShop(user) && (
          <div className="settings-section settings-section--tshirt">
            <div className="settings-section-header">
              <h2>Uniform-Größe</h2>
              <p>Ihre Uniform-Größe für Bestellungen</p>
            </div>
            {tshirtError && <div className="alert alert--error">{tshirtError}</div>}
            {tshirtSuccess && <div className="alert alert--success">{tshirtSuccess}</div>}
            <form onSubmit={handleTshirtSubmit} className="settings-form">
              <div className="form-group">
                <label htmlFor="tshirtGroesse" className="form-label">Größe</label>
                <select
                  id="tshirtGroesse"
                  name="tshirtGroesse"
                  className="form-input"
                  value={tshirtGroesse}
                  onChange={(ev) => {
                    setTshirtGroesse(ev.target.value);
                    setTshirtError('');
                    setTshirtSuccess('');
                  }}
                >
                  {TSHIRT_GROESSE_OPTIONS.map((opt) => (
                    <option key={opt.value || '__empty'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn--primary" disabled={tshirtSaving}>
                {tshirtSaving ? 'Speichern…' : 'Speichern'}
              </button>
            </form>
          </div>
        )}
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
