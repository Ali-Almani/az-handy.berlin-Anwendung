const ProfileForm = ({ formData, loading, onInputChange, onAvatarChange, onSubmit }) => (
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
    <div className="form-group">
      <label htmlFor="name" className="form-label">Name</label>
      <input type="text" id="name" name="name" className="form-input" value={formData.name} onChange={onInputChange} required />
    </div>
    <div className="form-group">
      <label htmlFor="email" className="form-label">E-Mail</label>
      <input type="email" id="email" name="email" className="form-input" value={formData.email} onChange={onInputChange} required />
    </div>
    <button type="submit" className="btn btn--primary" disabled={loading}>
      {loading ? 'Speichern...' : 'Profil speichern'}
    </button>
  </form>
);

export default ProfileForm;
