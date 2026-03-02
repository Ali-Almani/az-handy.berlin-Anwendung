const PasswordForm = ({ passwordData, loading, onChange, onSubmit }) => (
  <form onSubmit={onSubmit} className="settings-form">
    <div className="form-group">
      <label htmlFor="currentPassword" className="form-label">Aktuelles Passwort</label>
      <input type="password" id="currentPassword" name="currentPassword" className="form-input" value={passwordData.currentPassword} onChange={onChange} required />
    </div>
    <div className="form-group">
      <label htmlFor="newPassword" className="form-label">Neues Passwort</label>
      <input type="password" id="newPassword" name="newPassword" className="form-input" value={passwordData.newPassword} onChange={onChange} required minLength={6} />
      <small className="form-help">Mindestens 6 Zeichen</small>
    </div>
    <div className="form-group">
      <label htmlFor="confirmPassword" className="form-label">Passwort bestätigen</label>
      <input type="password" id="confirmPassword" name="confirmPassword" className="form-input" value={passwordData.confirmPassword} onChange={onChange} required />
    </div>
    <button type="submit" className="btn btn--primary" disabled={loading}>
      {loading ? 'Ändern...' : 'Passwort ändern'}
    </button>
  </form>
);

export default PasswordForm;
