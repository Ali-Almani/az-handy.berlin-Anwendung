import { useEffect, useId, useState } from 'react';
import { updateUserProfile } from '../../services/user.service';
import { EINSATZ_ORT_OPTIONS } from '../../utils/roles';
import { normalizeEinsatzOrt } from '../../constants/einsatzorte';

const NavbarEinsatzortSelect = ({ user, setUser, className = '' }) => {
  const selectId = useId();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(normalizeEinsatzOrt(user?.einsatz_ort) || user?.einsatz_ort || '');
  }, [user?.id, user?.einsatz_ort]);

  const handleChange = async (event) => {
    const next = event.target.value;
    const previous = value;
    setValue(next);
    setSaving(true);
    try {
      const response = await updateUserProfile({ einsatz_ort: next || null });
      setUser(response.data.user);
    } catch {
      setValue(previous);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className={`navbar-einsatzort${className ? ` ${className}` : ''}`}>
      <label className="navbar-einsatzort__label" htmlFor={selectId}>
        Filiale
      </label>
      <select
        id={selectId}
        className="navbar-einsatzort__select"
        value={value}
        onChange={handleChange}
        disabled={saving}
        aria-label="Filiale auswählen"
        title={value || 'Filiale wählen'}
      >
        {EINSATZ_ORT_OPTIONS.map((option) => (
          <option key={option.value === '' ? '_empty' : option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default NavbarEinsatzortSelect;
