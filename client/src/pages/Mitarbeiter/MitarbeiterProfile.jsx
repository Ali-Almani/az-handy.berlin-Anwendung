import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getDirectoryUser } from '../../services/user.service';
import './Mitarbeiter.scss';

const MitarbeiterProfile = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="mitarbeiter-page mitarbeiter-profile">
      <header className="mitarbeiter-page__header">
        <h1>Mitarbeiterprofil</h1>
      </header>
      {error && <div className="mitarbeiter-error">{error}</div>}
      {loading ? (
        <div className="mitarbeiter-loading">Lädt…</div>
      ) : profile ? (
        <div className="mitarbeiter-profile__card">
          {profile.avatar ? (
            <img src={profile.avatar} alt="" className="mitarbeiter-profile__avatar" />
          ) : (
            <div className="mitarbeiter-profile__avatar-placeholder" aria-hidden>
              {(profile.name || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <h2 className="mitarbeiter-profile__name">{profile.name}</h2>
          <p className="mitarbeiter-profile__meta">
            <strong>Einsatzort (Arbeit):</strong>{' '}
            {profile.einsatz_ort?.trim() ? profile.einsatz_ort : '– Keiner hinterlegt –'}
          </p>
          <p className="mitarbeiter-profile__role">
            <span className={`role-badge role-badge--${String(profile.role || '').replace(/\s+/g, '-')}`}>
              {profile.role || '–'}
            </span>
          </p>
          <Link to="/mitarbeiter" className="mitarbeiter-profile__back">
            ← Zur Übersicht
          </Link>
        </div>
      ) : null}
    </div>
  );
};

export default MitarbeiterProfile;
