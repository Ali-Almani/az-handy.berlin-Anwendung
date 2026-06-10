import { useState, useEffect } from 'react';
import { ROLE_OPTIONS, EINSATZ_ORT_OPTIONS } from '../../utils/roles';
import { normalizeEinsatzOrt } from '../../constants/einsatzorte';
import './UserEditModal.scss';

const UserEditModal = ({ user, onClose, onSave, loading }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [einsatzOrt, setEinsatzOrt] = useState('');
  const [telefon, setTelefon] = useState('');

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setRole(user.role || 'Marketing');
      setEinsatzOrt(normalizeEinsatzOrt(user.einsatz_ort) || user.einsatz_ort || '');
      setTelefon(user.telefon || '');
    }
  }, [user]);

  if (!user) return null;

  const isAdminAccount = (user.email || '').toLowerCase() === 'admin@az-handy.berlin';

  const handleSubmit = (e) => {
    e.preventDefault();
    const updates = {};
    if (!isAdminAccount && email !== user.email) updates.email = email;
    if (role !== user.role) updates.role = role;
    const prevOrt = normalizeEinsatzOrt(user.einsatz_ort) || user.einsatz_ort || '';
    if (einsatzOrt !== prevOrt) updates.einsatz_ort = einsatzOrt || null;
    const prevTel = user.telefon || '';
    if (telefon.trim() !== prevTel) updates.telefon = telefon.trim() || null;
    if (Object.keys(updates).length > 0) onSave(user.id, updates);
    onClose();
  };

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
            <label className="form-label">Rolle</label>
            <select className="form-input" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
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
