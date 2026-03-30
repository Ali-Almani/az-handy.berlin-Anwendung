import { useState } from 'react';
import PasswordField from '../PasswordField/PasswordField';
import './UserEditModal.scss';

const UserResetPasswordModal = ({ user, onClose, onSave, loading }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  if (!user) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen haben');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein');
      return;
    }
    onSave(user.id, newPassword);
    onClose();
  };

  return (
    <div className="user-edit-modal-overlay" onClick={onClose}>
      <div className="user-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="user-edit-modal-header">
          <h3>Passwort zurücksetzen – {user.name}</h3>
          <button type="button" className="user-edit-modal-close" onClick={onClose} aria-label="Schließen">×</button>
        </div>
        <form onSubmit={handleSubmit} className="user-edit-modal-form">
          <p className="form-help" style={{ marginBottom: '1rem' }}>
            Neues Passwort für <strong>{user.email}</strong> setzen.
          </p>
          {error && <div className="alert alert--error" style={{ marginBottom: '1rem' }}>{error}</div>}
          <div className="form-group">
            <label htmlFor="reset-new-password" className="form-label">Neues Passwort</label>
            <PasswordField
              id="reset-new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mindestens 6 Zeichen"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="reset-confirm-password" className="form-label">Passwort bestätigen</label>
            <PasswordField
              id="reset-confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Passwort wiederholen"
              required
              autoComplete="new-password"
            />
          </div>
          <div className="user-edit-modal-actions">
            <button type="button" className="btn btn--outline" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="btn btn--primary" disabled={loading}>Passwort zurücksetzen</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserResetPasswordModal;
