import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getUserProfile, updateUserProfile, updatePassword } from '../../services/user.service';
import { isAdmin } from '../../utils/roles';
import UserManagement from '../../components/UserManagement/UserManagement';
import './Settings.scss';

const Settings = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatar: null,
    avatarPreview: null
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await getUserProfile();
        const userData = response.data.user;
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          avatar: null,
          avatarPreview: userData.avatar || null
        });
      } catch (err) {
        setError('Profil konnte nicht geladen werden');
      }
    };
    
    if (user) {
      loadProfile();
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setSuccess('');
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Bitte wählen Sie eine Bilddatei aus');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Bild darf maximal 5MB groß sein');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          avatar: file,
          avatarPreview: reader.result
        }));
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setSuccess('');
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updateData = {
        name: formData.name,
        email: formData.email
      };

      // Add avatar if selected
      if (formData.avatar) {
        updateData.avatar = formData.avatarPreview; // In Mock: base64, in real: FormData
      }

      const response = await updateUserProfile(updateData);
      setUser(response.data.user);
      setSuccess('Profil erfolgreich aktualisiert!');
      
      // Reset avatar file input
      setFormData(prev => ({
        ...prev,
        avatar: null
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Fehler beim Aktualisieren des Profils');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validation
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
      await updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setSuccess('Passwort erfolgreich geändert!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
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

      <div className="settings-content">
        <div className="settings-section">
          <div className="settings-section-header">
            <h2>Profil bearbeiten</h2>
            <p>Ändern Sie Ihren Namen, E-Mail und Avatar</p>
          </div>

          <form onSubmit={handleProfileSubmit} className="settings-form">
            <div className="form-group">
              <label className="form-label">Profilbild</label>
              <div className="avatar-upload">
                <label htmlFor="avatar-upload" className="avatar-preview-label">
                  <div className="avatar-preview">
                    {formData.avatarPreview ? (
                      <>
                        <img 
                          src={formData.avatarPreview} 
                          alt="Avatar Preview" 
                          className="avatar-image"
                        />
                        <div className="avatar-overlay">
                          <span className="avatar-overlay-text">Bild ändern</span>
                        </div>
                      </>
                    ) : (
                      <div className="avatar-placeholder">
                        <span>{formData.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                        <div className="avatar-overlay">
                          <span className="avatar-overlay-text">Bild hochladen</span>
                        </div>
                      </div>
                    )}
                  </div>
                </label>
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="avatar-input"
                />
                {formData.avatar && (
                  <span className="avatar-filename">{formData.avatar.name}</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                E-Mail
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn--primary"
              disabled={loading}
            >
              {loading ? 'Speichern...' : 'Profil speichern'}
            </button>
          </form>
        </div>

        <div className="settings-section">
          <div className="settings-section-header">
            <h2>Passwort ändern</h2>
            <p>Ändern Sie Ihr Passwort für mehr Sicherheit</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="settings-form">
            <div className="form-group">
              <label htmlFor="currentPassword" className="form-label">
                Aktuelles Passwort
              </label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                className="form-input"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword" className="form-label">
                Neues Passwort
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                className="form-input"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                required
                minLength={6}
              />
              <small className="form-help">Mindestens 6 Zeichen</small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Passwort bestätigen
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                className="form-input"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn--primary"
              disabled={loading}
            >
              {loading ? 'Ändern...' : 'Passwort ändern'}
            </button>
          </form>
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
