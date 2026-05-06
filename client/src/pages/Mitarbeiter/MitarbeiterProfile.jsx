import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDirectoryUser, updateUserProfile } from '../../services/user.service';
import { EINSATZ_ORT_OPTIONS } from '../../utils/roles';
import './Mitarbeiter.scss';

const telHref = (raw) => {
  const s = String(raw || '').trim();
  if (!s) return null;
  const digits = s.replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : `tel:${s}`;
};

const MitarbeiterProfile = () => {
  const { userId } = useParams();
  const { user: authUser, setUser, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formName, setFormName] = useState('');
  const [formEinsatzOrt, setFormEinsatzOrt] = useState('');
  const [formTelefon, setFormTelefon] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const isOwnProfile = useMemo(
    () => Boolean(authUser && userId != null && String(authUser.id) === String(userId)),
    [authUser, userId]
  );

  useEffect(() => {
    if (userId == null || userId === '') return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getDirectoryUser(userId);
        if (!cancelled) {
          setProfile(res.data.user || null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || 'Profil konnte nicht geladen werden');
          setProfile(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!profile || !isOwnProfile) return;
    setFormName(profile.name || '');
    setFormEinsatzOrt(profile.einsatz_ort || '');
    setFormTelefon(profile.telefon || '');
    setAvatarFile(null);
    setAvatarPreview(profile.avatar || null);
    setFormError('');
    setFormSuccess('');
  }, [profile, isOwnProfile]);

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
    if (!isOwnProfile) return;
    setSaving(true);
    setFormError('');
    setFormSuccess('');
    try {
      const response = await updateUserProfile({ avatar: null });
      setUser(response.data.user);
      setAvatarFile(null);
      setAvatarPreview(null);
      setProfile((p) => (p ? { ...p, avatar: null } : p));
      setFormSuccess('Profilbild wurde entfernt.');
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Fehler beim Entfernen des Bildes');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOwnProfile) return;
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
        einsatz_ort: formEinsatzOrt || null,
        telefon: formTelefon.trim() || null
      };
      if (avatarFile && avatarPreview) payload.avatar = avatarPreview;
      const response = await updateUserProfile(payload);
      setUser(response.data.user);
      setAvatarFile(null);
      setProfile((p) => {
        if (!p) return p;
        const u = response.data.user;
        return {
          ...p,
          name: u.name,
          ...(u.avatar !== undefined ? { avatar: u.avatar } : {}),
          ...(u.einsatz_ort !== undefined ? { einsatz_ort: u.einsatz_ort } : {}),
          ...(u.telefon !== undefined ? { telefon: u.telefon } : {})
        };
      });
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

  return (
    <div className="mitarbeiter-page mitarbeiter-profile">
      <header className="mitarbeiter-page__header">
        <h1>Mitarbeiterprofil</h1>
      </header>
      {error && <div className="mitarbeiter-error">{error}</div>}
      {(loading || authLoading) ? (
        <div className="mitarbeiter-loading">Lädt…</div>
      ) : profile ? (
        isOwnProfile ? (
          <div className="mitarbeiter-profile__card">
            <form className="mitarbeiter-profile__form" onSubmit={handleSubmit}>
              {formError && <div className="mitarbeiter-form-message mitarbeiter-form-message--error">{formError}</div>}
              {formSuccess && <div className="mitarbeiter-form-message mitarbeiter-form-message--success">{formSuccess}</div>}

              <div className="mitarbeiter-form-group">
                <span className="mitarbeiter-form-label">Profilbild</span>
                <div className="mitarbeiter-avatar-upload">
                  <label htmlFor="mitarbeiter-avatar-input" className="mitarbeiter-avatar-edit-wrap">
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
                    id="mitarbeiter-avatar-input"
                    type="file"
                    accept="image/*"
                    className="mitarbeiter-avatar-input"
                    onChange={handleAvatarChange}
                  />
                </div>
                {avatarPreview && (
                  <button
                    type="button"
                    className="mitarbeiter-btn mitarbeiter-btn--secondary"
                    onClick={handleAvatarRemove}
                    disabled={saving}
                  >
                    Bild löschen
                  </button>
                )}
              </div>

              <div className="mitarbeiter-form-group">
                <label htmlFor="mitarbeiter-name" className="mitarbeiter-form-label">Name</label>
                <input
                  id="mitarbeiter-name"
                  type="text"
                  className="mitarbeiter-form-input"
                  value={formName}
                  onChange={(ev) => setFormName(ev.target.value)}
                  required
                  autoComplete="name"
                />
              </div>

              <div className="mitarbeiter-form-group">
                <label htmlFor="mitarbeiter-ort" className="mitarbeiter-form-label">Einsatzort</label>
                <select
                  id="mitarbeiter-ort"
                  className="mitarbeiter-form-input"
                  value={formEinsatzOrt}
                  onChange={(ev) => setFormEinsatzOrt(ev.target.value)}
                >
                  {EINSATZ_ORT_OPTIONS.map((o) => (
                    <option key={o.value === '' ? '_empty' : o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mitarbeiter-form-group">
                <label htmlFor="mitarbeiter-telefon" className="mitarbeiter-form-label">Telefon</label>
                <input
                  id="mitarbeiter-telefon"
                  type="tel"
                  className="mitarbeiter-form-input"
                  value={formTelefon}
                  onChange={(ev) => setFormTelefon(ev.target.value)}
                  autoComplete="tel"
                  maxLength={40}
                  placeholder="z. B. 030 12345678"
                />
              </div>

              <button type="submit" className="mitarbeiter-btn mitarbeiter-btn--primary" disabled={saving || avatarLoading}>
                {saving ? 'Speichern…' : avatarLoading ? 'Bild wird geladen…' : 'Speichern'}
              </button>
            </form>
            <Link to="/mitarbeiter" className="mitarbeiter-profile__back">
              ← Zur Übersicht
            </Link>
          </div>
        ) : (
          <div className="mitarbeiter-profile__card mitarbeiter-profile__card--readonly">
            {profile.avatar ? (
              <img src={profile.avatar} alt="" className="mitarbeiter-profile__avatar" />
            ) : (
              <div className="mitarbeiter-profile__avatar-placeholder" aria-hidden>
                {(profile.name || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <h2 className="mitarbeiter-profile__name">{profile.name}</h2>
            <p className="mitarbeiter-profile__meta">
              <strong>Einsatzort:</strong>{' '}
              {profile.einsatz_ort?.trim() ? profile.einsatz_ort : '– Keiner hinterlegt –'}
            </p>
            <p className="mitarbeiter-profile__meta">
              <strong>Telefon:</strong>{' '}
              {profile.telefon?.trim() ? (
                <a href={telHref(profile.telefon)} className="mitarbeiter-tel-link">
                  {profile.telefon.trim()}
                </a>
              ) : (
                '–'
              )}
            </p>
            <Link to="/mitarbeiter" className="mitarbeiter-profile__back">
              ← Zur Übersicht
            </Link>
          </div>
        )
      ) : null}
    </div>
  );
};

export default MitarbeiterProfile;
