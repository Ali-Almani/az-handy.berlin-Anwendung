import { useEffect, useState } from 'react';
import { updateUserProfile } from '../../services/user.service';
import '../../pages/Mitarbeiter/Mitarbeiter.scss';

const OwnProfileForm = ({ user, setUser }) => {
  const [formName, setFormName] = useState('');
  const [formTelefon, setFormTelefon] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  useEffect(() => {
    if (!user) return;
    setFormName(user.name || '');
    setFormTelefon(user.telefon || '');
    setAvatarFile(null);
    setAvatarPreview(user.avatar || null);
    setFormError('');
    setFormSuccess('');
  }, [user?.id, user?.name, user?.telefon, user?.avatar]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Bitte wählen Sie eine Bilddatei aus');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Bild darf maximal 5MB groß sein');
      return;
    }
    setFormError('');
    setAvatarLoading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarFile(file);
      setAvatarPreview(reader.result);
      setAvatarLoading(false);
    };
    reader.onerror = () => {
      setAvatarLoading(false);
      setFormError('Bild konnte nicht gelesen werden');
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarRemove = async () => {
    setSaving(true);
    setFormError('');
    setFormSuccess('');
    try {
      const response = await updateUserProfile({ avatar: null });
      setUser(response.data.user);
      setAvatarFile(null);
      setAvatarPreview(null);
      setFormSuccess('Profilbild wurde entfernt.');
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Fehler beim Entfernen des Bildes');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = formName.trim();
    if (!name) {
      setFormError('Bitte geben Sie einen Namen ein.');
      return;
    }
    setSaving(true);
    setFormError('');
    setFormSuccess('');
    try {
      const payload = {
        name,
        telefon: formTelefon.trim() || null
      };
      if (avatarFile && avatarPreview) payload.avatar = avatarPreview;
      const response = await updateUserProfile(payload);
      setUser(response.data.user);
      setAvatarFile(null);
      if (response.data.user.avatar !== undefined) {
        setAvatarPreview(response.data.user.avatar || null);
      }
      setFormSuccess('Profil gespeichert.');
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <form className="mitarbeiter-profile__form settings-form" onSubmit={handleSubmit}>
      {formError && <div className="alert alert--error">{formError}</div>}
      {formSuccess && <div className="alert alert--success">{formSuccess}</div>}

      <div className="mitarbeiter-form-group">
        <span className="mitarbeiter-form-label">Profilbild</span>
        <div className="mitarbeiter-avatar-upload">
          <label htmlFor="settings-avatar-input" className="mitarbeiter-avatar-edit-wrap">
            {avatarPreview ? (
              <img src={avatarPreview} alt="" className="mitarbeiter-profile__avatar mitarbeiter-profile__avatar--editable" />
            ) : (
              <div className="mitarbeiter-profile__avatar-placeholder mitarbeiter-profile__avatar-placeholder--editable" aria-hidden>
                {(formName || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="mitarbeiter-avatar-edit-hint">Bild ändern</span>
          </label>
          <input
            id="settings-avatar-input"
            type="file"
            accept="image/*"
            className="mitarbeiter-avatar-input"
            onChange={handleAvatarChange}
          />
        </div>
        {avatarPreview && (
          <button
            type="button"
            className="btn btn--secondary btn--small"
            onClick={handleAvatarRemove}
            disabled={saving}
          >
            Bild löschen
          </button>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="settings-name" className="form-label">Name</label>
        <input
          id="settings-name"
          type="text"
          className="form-input"
          value={formName}
          onChange={(ev) => setFormName(ev.target.value)}
          required
          autoComplete="name"
        />
      </div>

      <div className="form-group">
        <label htmlFor="settings-telefon" className="form-label">Telefon</label>
        <input
          id="settings-telefon"
          type="tel"
          className="form-input"
          value={formTelefon}
          onChange={(ev) => setFormTelefon(ev.target.value)}
          autoComplete="tel"
          maxLength={40}
          placeholder="z. B. 030 12345678"
        />
      </div>

      <button type="submit" className="btn btn--primary" disabled={saving || avatarLoading}>
        {saving ? 'Speichern…' : avatarLoading ? 'Bild wird geladen…' : 'Speichern'}
      </button>
    </form>
  );
};

export default OwnProfileForm;
