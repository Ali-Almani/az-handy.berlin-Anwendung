import { useState, useEffect } from 'react';
import { ROLE_OPTIONS } from '../../utils/roles';
import './UserEditModal.scss';

const UserEditModal = ({ user, onClose, onSave, loading }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setRole(user.role || 'Marketing');
    }
  }, [user]);

  if (!user) return null;

  const isAdminAccount = (user.email || '').toLowerCase() === 'admin@az-handy.berlin';

  const handleSubmit = (e) => {
    e.preventDefault();
    const updates = {};
    if (!isAdminAccount && email !== user.email) updates.email = email;
    if (role !== user.role) updates.role = role;
    if (Object.keys(updates).length > 0) onSave(user.id, updates);
    onClose();
  };

  return (
    <div className="user-edit-modal-overlay" onClick={onClose}>
      <div className="user-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="user-edit-modal-header">
          <h3>Benutzer bearbeiten</h3>
          <button type="button" className="user-edit-modal-close" onClick={onClose} aria-label="Schließen">×</button>
        </div>
        <form onSubmit={handleSubmit} className="user-edit-modal-form">
          <div className="form-group">
            <label className="form-label">E-Mail</label>
            <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required readOnly={isAdminAccount} />
          </div>
          <div className="form-group">
            <label className="form-label">Rolle</label>
            <select className="form-input" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="user-edit-modal-actions">
            <button type="button" className="btn btn--outline" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="btn btn--primary" disabled={loading}>Speichern</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserEditModal;
