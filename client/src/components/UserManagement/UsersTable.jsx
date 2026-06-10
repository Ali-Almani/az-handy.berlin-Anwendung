import { useState } from 'react';
import { createPortal } from 'react-dom';
import UserEditModal from './UserEditModal';
import UserResetPasswordModal from './UserResetPasswordModal';
import { formatEinsatzOrt } from '../../constants/einsatzorte';

const UsersTable = ({ users, loading, onDelete, onEdit, onResetPassword }) => {
  const [editingUser, setEditingUser] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);

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
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Einsatz Ort</th>
                <th>Telefon</th>
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
                  <td>{formatEinsatzOrt(user.einsatz_ort)}</td>
                  <td>{user.telefon?.trim() ? user.telefon : '–'}</td>
                  <td>{user.email}</td>
                  <td><span className={`role-badge role-badge--${user.role}`}>{user.role}</span></td>
                  <td>{(user.createdAt ?? user.created_at) ? new Date(user.createdAt ?? user.created_at).toLocaleDateString('de-DE') : '-'}</td>
                  <td>
                    <div className="user-actions user-actions-dropdown">
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {openDropdownId && (() => {
        const user = users.find(u => u.id === openDropdownId);
        if (!user) return null;
        const dropdownContent = (
          <div className="user-actions-dropdown-overlay" onClick={() => setOpenDropdownId(null)}>
            <div className="user-actions-dropdown-menu user-actions-dropdown-menu--centered" onClick={(e) => e.stopPropagation()}>
              <div className="user-actions-dropdown-header">Aktionen – {user.name}</div>
              <button type="button" onClick={() => { setResetPasswordUser(user); setOpenDropdownId(null); }}>Passwort zurücksetzen</button>
              <button type="button" onClick={() => handleEditClick(user)}>Bearbeiten</button>
              <button type="button" onClick={() => { onDelete?.(user.id); setOpenDropdownId(null); }} className="user-actions-dropdown-item--danger">Löschen</button>
            </div>
          </div>
        );
        return createPortal(dropdownContent, document.body);
      })()}
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
