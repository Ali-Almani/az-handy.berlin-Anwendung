import { useState, useEffect } from 'react';
import { createUser, getAllUsers, updateUserByAdmin, deleteUser, setPasswordByAdmin } from '../../services/user.service';
import UserForm from './UserForm';
import UsersTable from './UsersTable';
import './UserManagement.scss';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '', email: '', password: '', role: 'Marketing', avatar: null, avatarPreview: null
  });

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getAllUsers();
      setUsers(response.data.users || []);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Benutzer konnten nicht geladen werden';
      setError(msg);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUserData(prev => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Bitte wählen Sie eine Bilddatei aus'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Bild darf maximal 5MB groß sein'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setNewUserData(prev => ({ ...prev, avatar: file, avatarPreview: reader.result }));
    reader.readAsDataURL(file);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    if (newUserData.password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein');
      setLoading(false);
      return;
    }
    try {
      const userData = { name: newUserData.name, email: newUserData.email, password: newUserData.password, role: newUserData.role };
      if (newUserData.avatarPreview) userData.avatar = newUserData.avatarPreview;
      await createUser(userData);
      setSuccess('Benutzer erfolgreich erstellt!');
      setNewUserData({ name: '', email: '', password: '', role: 'Marketing', avatar: null, avatarPreview: null });
      setShowForm(false);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Fehler beim Erstellen des Benutzers');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (userId, updates) => {
    try {
      setLoading(true);
      setError('');
      await updateUserByAdmin(userId, updates);
      setSuccess('Benutzer erfolgreich aktualisiert!');
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Fehler beim Aktualisieren des Benutzers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Möchten Sie diesen Benutzer wirklich löschen?')) return;
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

  const handleResetPassword = async (userId, newPassword) => {
    try {
      setLoading(true);
      setError('');
      await setPasswordByAdmin(userId, newPassword);
      setSuccess('Passwort erfolgreich gesetzt!');
    } catch (err) {
      setError(err.response?.data?.message || 'Fehler beim Setzen des Passworts');
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
        <button onClick={() => setShowForm(!showForm)} className="btn btn--primary">
          {showForm ? 'Abbrechen' : '+ Neuer Benutzer'}
        </button>
      </div>
      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}
      {showForm && (
        <UserForm
          newUserData={newUserData}
          loading={loading}
          onInputChange={handleInputChange}
          onAvatarChange={handleAvatarChange}
          onSubmit={handleSubmit}
        />
      )}
      <UsersTable users={users} loading={loading && !showForm} onDelete={handleDelete} onEdit={handleEdit} onResetPassword={handleResetPassword} />
    </div>
  );
};

export default UserManagement;
