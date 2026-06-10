import { useEffect, useState, useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDirectoryUser } from '../../services/user.service';
import { formatEinsatzOrt } from '../../constants/einsatzorte';
import './Mitarbeiter.scss';

const telHref = (raw) => {
  const s = String(raw || '').trim();
  if (!s) return null;
  const digits = s.replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : `tel:${s}`;
};

const MitarbeiterProfile = () => {
  const { userId } = useParams();
  const { user: authUser, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (isOwnProfile) {
    return <Navigate to="/settings" replace />;
  }

  return (
    <div className="mitarbeiter-page mitarbeiter-profile">
      <header className="mitarbeiter-page__header">
        <h1>Mitarbeiterprofil</h1>
      </header>
      {error && <div className="mitarbeiter-error">{error}</div>}
      {(loading || authLoading) ? (
        <div className="mitarbeiter-loading">Lädt…</div>
      ) : profile ? (
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
            {profile.einsatz_ort?.trim() ? formatEinsatzOrt(profile.einsatz_ort) : '– Keiner hinterlegt –'}
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
      ) : null}
    </div>
  );
};

export default MitarbeiterProfile;
