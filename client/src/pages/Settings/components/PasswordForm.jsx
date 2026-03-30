import PasswordField from '../../../components/PasswordField/PasswordField';

const PasswordForm = ({ passwordData, loading, onChange, onSubmit }) => (
  <form onSubmit={onSubmit} className="settings-form">
    <div className="form-group">
      <label htmlFor="currentPassword" className="form-label">Aktuelles Passwort</label>
      <PasswordField
        id="currentPassword"
        name="currentPassword"
        value={passwordData.currentPassword}
        onChange={onChange}
        required
        autoComplete="current-password"
      />
    </div>
    <div className="form-group">
      <label htmlFor="newPassword" className="form-label">Neues Passwort</label>
      <PasswordField
        id="newPassword"
        name="newPassword"
        value={passwordData.newPassword}
        onChange={onChange}
        required
        minLength={6}
        autoComplete="new-password"
      />
      <small className="form-help">Mindestens 6 Zeichen</small>
    </div>
    <div className="form-group">
      <label htmlFor="confirmPassword" className="form-label">Passwort bestätigen</label>
      <PasswordField
        id="confirmPassword"
        name="confirmPassword"
        value={passwordData.confirmPassword}
        onChange={onChange}
        required
        autoComplete="new-password"
      />
    </div>
    <button type="submit" className="btn btn--primary" disabled={loading}>
      {loading ? 'Ändern...' : 'Passwort ändern'}
    </button>
  </form>
);

export default PasswordForm;
