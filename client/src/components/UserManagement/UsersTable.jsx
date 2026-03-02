import { ROLE_OPTIONS } from '../../utils/roles';

const UsersTable = ({ users, loading, onDelete, onEdit }) => (
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
                  <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('de-DE') : '-'}</td>
                  <td>
                    <div className="user-actions">
                      <select
                        value={user.role || ''}
                        onChange={(e) => { const role = e.target.value; if (role !== user.role) onEdit?.(user.id, { role }); }}
                        disabled={loading}
                        className="role-select"
                        title="Rolle ändern"
                      >
                        {!ROLE_OPTIONS.some(o => o.value === user.role) && user.role && (
                          <option value={user.role}>{user.role}</option>
                        )}
                        {ROLE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => onDelete?.(user.id)}
                        className="btn btn--danger btn--small"
                        disabled={loading}
                      >
                        Löschen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
);

export default UsersTable;
