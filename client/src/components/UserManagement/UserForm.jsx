import { ROLE_OPTIONS, EINSATZ_ORT_OPTIONS } from '../../utils/roles';

const UserForm = ({ newUserData, loading, onInputChange, onAvatarChange, onSubmit }) => (
  <div className="user-form-section">
    <h3>Neuen Benutzer erstellen</h3>
    <form onSubmit={onSubmit} className="user-form">
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="new-name" className="form-label">Name</label>
          <input type="text" id="new-name" name="name" className="form-input" value={newUserData.name} onChange={onInputChange} required />
        </div>
        <div className="form-group">
          <label htmlFor="new-email" className="form-label">E-Mail</label>
          <input type="email" id="new-email" name="email" className="form-input" value={newUserData.email} onChange={onInputChange} required />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="new-password" className="form-label">Passwort</label>
          <input type="password" id="new-password" name="password" className="form-input" value={newUserData.password} onChange={onInputChange} required minLength={6} />
          <small className="form-help">Mindestens 6 Zeichen</small>
        </div>
        <div className="form-group">
          <label htmlFor="new-role" className="form-label">Rolle</label>
          <select id="new-role" name="role" className="form-input" value={newUserData.role} onChange={onInputChange} required>
            {ROLE_OPTIONS.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="new-einsatz-ort" className="form-label">Einsatz Ort</label>
          <select id="new-einsatz-ort" name="einsatz_ort" className="form-input" value={newUserData.einsatz_ort || ''} onChange={onInputChange}>
            {EINSATZ_ORT_OPTIONS.map(opt => <option key={opt.value || 'none'} value={opt.value}>{opt.label}</option>)}
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
                  <img src={newUserData.avatarPreview} alt="Avatar Preview" className="avatar-image-small" />
                  <div className="avatar-overlay-small"><span className="avatar-overlay-text-small">Bild ändern</span></div>
                </>
              ) : (
                <div className="avatar-placeholder-small">
                  <span>{newUserData.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                  <div className="avatar-overlay-small"><span className="avatar-overlay-text-small">Bild hochladen</span></div>
                </div>
              )}
            </div>
          </label>
          <input type="file" id="new-avatar-upload" accept="image/*" onChange={onAvatarChange} className="avatar-input" />
        </div>
      </div>
      <button type="submit" className="btn btn--primary" disabled={loading}>
        {loading ? 'Erstellen...' : 'Benutzer erstellen'}
      </button>
    </form>
  </div>
);

export default UserForm;
