import { useState, useEffect } from 'react';
import { canHaveImeiLimit, EINSATZ_ORT_OPTIONS, pickPrimaryRole, selectedRoleValues } from '../../utils/roles';
import { normalizeEinsatzOrt } from '../../constants/einsatzorte';
import { DEFAULT_IMEI_LIMIT, MAX_IMEI_LIMIT, MIN_IMEI_LIMIT, parseImeiLimit } from '../../pages/Imeis/utils/copyHistoryRetention';
import RoleCheckboxes from './RoleCheckboxes';
import './UserEditModal.scss';

const UserEditModal = ({ user, onClose, onSave, loading }) => {
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState([]);
  const [einsatzOrt, setEinsatzOrt] = useState('');
  const [telefon, setTelefon] = useState('');
  const [imeiLimit, setImeiLimit] = useState(String(DEFAULT_IMEI_LIMIT));

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setRoles(selectedRoleValues(user));
      setEinsatzOrt(normalizeEinsatzOrt(user.einsatz_ort) || user.einsatz_ort || '');
      setTelefon(user.telefon || '');
      setImeiLimit(String(parseImeiLimit(user.imei_limit ?? user.imeiLimit, DEFAULT_IMEI_LIMIT) ?? DEFAULT_IMEI_LIMIT));
    }
  }, [user]);

  if (!user) return null;

  const isAdminAccount = (user.email || '').toLowerCase() === 'admin@az-handy.berlin';

  const handleSubmit = (e) => {
    e.preventDefault();
    const updates = {};
    if (!isAdminAccount && email !== user.email) updates.email = email;
    const nextRoles = roles.length ? roles : selectedRoleValues(user);
    const nextPrimary = pickPrimaryRole(user.role, nextRoles);
    updates.roles = nextRoles;
    if (nextPrimary !== user.role) updates.role = nextPrimary;
    const prevOrt = normalizeEinsatzOrt(user.einsatz_ort) || user.einsatz_ort || '';
    if (einsatzOrt !== prevOrt) updates.einsatz_ort = einsatzOrt || null;
    const prevTel = user.telefon || '';
    if (telefon.trim() !== prevTel) updates.telefon = telefon.trim() || null;
    if (canHaveImeiLimit(nextRoles)) {
      const parsed = parseImeiLimit(imeiLimit, null);
      if (parsed == null) return;
      updates.imei_limit = parsed;
    }
    if (Object.keys(updates).length > 0) onSave(user.id, updates);
    onClose();
  };

  const showImeiLimit = canHaveImeiLimit(roles);

  return (
    <div className="user-edit-modal-overlay" onClick={onClose}>
      <div className="user-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="user-edit-modal-header">
          <h3>Benutzer bearbeiten</h3>
          <button type="button" className="user-edit-modal-close" onClick={onClose} aria-label="Schließen">×</button>
        </div>
        <form onSubmit={handleSubmit} className="user-edit-modal-form">
          <div className="form-group">
            <label className="form-label">E-Mail</label>
            <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required readOnly={isAdminAccount} />
          </div>
          <div className="form-group">
            <span className="form-label">Rollen</span>
            <RoleCheckboxes idPrefix="edit-role" selected={roles} onChange={setRoles} />
          </div>
          <div className="form-group">
            <label className="form-label">Einsatz Ort</label>
            <select className="form-input" value={einsatzOrt} onChange={(e) => setEinsatzOrt(e.target.value)}>
              {EINSATZ_ORT_OPTIONS.map((opt) => (
                <option key={opt.value || 'none'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Telefon</label>
            <input type="tel" className="form-input" value={telefon} onChange={(e) => setTelefon(e.target.value)} maxLength={40} />
          </div>
          {showImeiLimit ? (
            <div className="form-group">
              <label className="form-label" htmlFor="edit-imei-limit">IMEI-Limit</label>
              <input
                id="edit-imei-limit"
                type="number"
                className="form-input"
                min={MIN_IMEI_LIMIT}
                max={MAX_IMEI_LIMIT}
                step="1"
                value={imeiLimit}
                onChange={(e) => setImeiLimit(e.target.value)}
                required
              />
              <p className="form-hint">Maximale offene IMEI-Reservierungen (1–999). Standard: {DEFAULT_IMEI_LIMIT}.</p>
            </div>
          ) : null}
          <div className="user-edit-modal-actions">
            <button type="button" className="btn btn--outline" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="btn btn--primary" disabled={loading}>Speichern</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserEditModal;
