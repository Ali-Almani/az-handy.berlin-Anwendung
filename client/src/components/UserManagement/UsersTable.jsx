import { useState, useRef, useEffect } from 'react';
import UserEditModal from './UserEditModal';
import UserResetPasswordModal from './UserResetPasswordModal';

const UsersTable = ({ users, loading, onDelete, onEdit, onResetPassword }) => {
  const [editingUser, setEditingUser] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEditClick = (user) => { setEditingUser(user); setOpenDropdownId(null); };
  const handleEditSave = (userId, updates) => {
    onEdit?.(userId, updates);
    setEditingUser(null);
  };
  const handleResetPasswordSave = (userId, newPassword) => {
    onResetPassword?.(userId, newPassword);
    setResetPasswordUser(null);
  };

  return (
    <div className="users-list">
      <h3>Alle Benutzer ({users.length})</h3>
      {loading ? (
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
                        <div className="user-avatar-placeholder-small">{user.name?.charAt(0)?.toUpperCase()}</div>
                      )}
                      <span>{user.name}</span>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td><span className={`role-badge role-badge--${user.role}`}>{user.role}</span></td>
                  <td>{(user.createdAt ?? user.created_at) ? new Date(user.createdAt ?? user.created_at).toLocaleDateString('de-DE') : '-'}</td>
                  <td>
                    <div className="user-actions user-actions-dropdown" ref={openDropdownId === user.id ? dropdownRef : null}>
                      <button
                        type="button"
                        onClick={() => setOpenDropdownId(openDropdownId === user.id ? null : user.id)}
                        className="btn btn--outline btn--small"
                        disabled={loading}
                        aria-haspopup="true"
                        aria-expanded={openDropdownId === user.id}
                      >
                        Aktionen ▾
                      </button>
                      {openDropdownId === user.id && (
                        <div className="user-actions-dropdown-menu">
                          <button type="button" onClick={() => { setResetPasswordUser(user); setOpenDropdownId(null); }}>Passwort zurücksetzen</button>
                          <button type="button" onClick={() => handleEditClick(user)}>Bearbeiten</button>
                          <button type="button" onClick={() => { onDelete?.(user.id); setOpenDropdownId(null); }} className="user-actions-dropdown-item--danger">Löschen</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editingUser && (
        <UserEditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleEditSave}
          loading={loading}
        />
      )}
      {resetPasswordUser && (
        <UserResetPasswordModal
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          onSave={handleResetPasswordSave}
          loading={loading}
        />
      )}
    </div>
  );
};

export default UsersTable;
