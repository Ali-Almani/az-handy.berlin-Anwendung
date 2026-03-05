const ProfileForm = ({ formData, loading, onAvatarChange, onSubmit }) => (
  <form onSubmit={onSubmit} className="settings-form">
    <div className="form-group">
      <label className="form-label">Profilbild</label>
      <div className="avatar-upload">
        <label htmlFor="avatar-upload" className="avatar-preview-label">
          <div className="avatar-preview">
            {formData.avatarPreview ? (
              <>
                <img src={formData.avatarPreview} alt="Avatar Preview" className="avatar-image" />
                <div className="avatar-overlay"><span className="avatar-overlay-text">Bild ändern</span></div>
              </>
            ) : (
              <div className="avatar-placeholder">
                <span>{formData.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                <div className="avatar-overlay"><span className="avatar-overlay-text">Bild hochladen</span></div>
              </div>
            )}
          </div>
        </label>
        <input type="file" id="avatar-upload" accept="image/*" onChange={onAvatarChange} className="avatar-input" />
        {formData.avatar && <span className="avatar-filename">{formData.avatar.name}</span>}
      </div>
    </div>
    <button type="submit" className="btn btn--primary" disabled={loading}>
      {loading ? 'Speichern...' : 'Profil speichern'}
    </button>
  </form>
);

export default ProfileForm;
