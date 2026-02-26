import { useState, useEffect } from 'react';
import { createUser, getAllUsers, deleteUser } from '../../services/user.service';
import { ROLE_OPTIONS } from '../../utils/roles';
import './UserManagement.scss';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Marketing',
    avatar: null,
    avatarPreview: null
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await getAllUsers();
      setUsers(response.data.users || []);
    } catch (err) {
      setError('Benutzer konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUserData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setSuccess('');
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Bitte wählen Sie eine Bilddatei aus');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setError('Bild darf maximal 5MB groß sein');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setNewUserData(prev => ({
          ...prev,
          avatar: file,
          avatarPreview: reader.result
        }));
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (newUserData.password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein');
      setLoading(false);
      return;
    }

    try {
      const userData = {
        name: newUserData.name,
        email: newUserData.email,
        password: newUserData.password,
        role: newUserData.role
      };

      if (newUserData.avatarPreview) {
        userData.avatar = newUserData.avatarPreview;
      }

      await createUser(userData);
      setSuccess('Benutzer erfolgreich erstellt!');
      setNewUserData({
        name: '',
        email: '',
        password: '',
        role: 'Marketing',
        avatar: null,
        avatarPreview: null
      });
      setShowForm(false);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Fehler beim Erstellen des Benutzers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Möchten Sie diesen Benutzer wirklich löschen?')) {
      return;
    }

    try {
      setLoading(true);
      await deleteUser(userId);
      setSuccess('Benutzer erfolgreich gelöscht!');
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Fehler beim Löschen des Benutzers');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-management">
      <div className="user-management-header">
        <div>
          <h2>Benutzerverwaltung</h2>
          <p>Erstellen und verwalten Sie Benutzer</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn--primary"
        >
          {showForm ? 'Abbrechen' : '+ Neuer Benutzer'}
        </button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}

      {showForm && (
        <div className="user-form-section">
          <h3>Neuen Benutzer erstellen</h3>
          <form onSubmit={handleSubmit} className="user-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="new-name" className="form-label">Name</label>
                <input
                  type="text"
                  id="new-name"
                  name="name"
                  className="form-input"
                  value={newUserData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="new-email" className="form-label">E-Mail</label>
                <input
                  type="email"
                  id="new-email"
                  name="email"
                  className="form-input"
                  value={newUserData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="new-password" className="form-label">Passwort</label>
                <input
                  type="password"
                  id="new-password"
                  name="password"
                  className="form-input"
                  value={newUserData.password}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                />
                <small className="form-help">Mindestens 6 Zeichen</small>
              </div>

              <div className="form-group">
                <label htmlFor="new-role" className="form-label">Rolle</label>
                <select
                  id="new-role"
                  name="role"
                  className="form-input"
                  value={newUserData.role}
                  onChange={handleInputChange}
                  required
                >
                  {ROLE_OPTIONS.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Profilbild (optional)</label>
              <div className="avatar-upload-small">
                <label htmlFor="new-avatar-upload" className="avatar-preview-label-small">
                  <div className="avatar-preview-small">
                    {newUserData.avatarPreview ? (
                      <>
                        <img 
                          src={newUserData.avatarPreview} 
                          alt="Avatar Preview" 
                          className="avatar-image-small"
                        />
                        <div className="avatar-overlay-small">
                          <span className="avatar-overlay-text-small">Bild ändern</span>
                        </div>
                      </>
                    ) : (
                      <div className="avatar-placeholder-small">
                        <span>{newUserData.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                        <div className="avatar-overlay-small">
                          <span className="avatar-overlay-text-small">Bild hochladen</span>
                        </div>
                      </div>
                    )}
                  </div>
                </label>
                <input
                  type="file"
                  id="new-avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="avatar-input"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn--primary"
              disabled={loading}
            >
              {loading ? 'Erstellen...' : 'Benutzer erstellen'}
            </button>
          </form>
        </div>
      )}

      <div className="users-list">
        <h3>Alle Benutzer ({users.length})</h3>
        {loading && !showForm ? (
          <div className="loading">Lädt...</div>
        ) : users.length === 0 ? (
          <div className="empty-state">Keine Benutzer gefunden</div>
        ) : (
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>E-Mail</th>
                  <th>Rolle</th>
                  <th>Erstellt</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="user-avatar-small" />
                        ) : (
                          <div className="user-avatar-placeholder-small">
                            {user.name?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                        <span>{user.name}</span>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className="role-badge role-badge--{user.role}">
                        {user.role}
                      </span>
                    </td>
                    <td>
                      {user.createdAt 
                        ? new Date(user.createdAt).toLocaleDateString('de-DE')
                        : '-'}
                    </td>
                    <td>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="btn btn--danger btn--small"
                        disabled={loading}
                      >
                        Löschen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
