import { useState } from 'react';
import './PasswordField.scss';

const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path
      d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path
      d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M1 1l22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/** Passwort-Eingabe mit Auge-Icon zum Ein-/Ausblenden (type wird intern gesteuert). */
const PasswordField = ({ className = 'form-input', wrapperClassName = '', disabled, ...inputProps }) => {
  const [visible, setVisible] = useState(false);
  const inputClass = [className, 'form-password-field__input'].filter(Boolean).join(' ');

  return (
    <div className={['form-password-field', wrapperClassName].filter(Boolean).join(' ')}>
      <input
        {...inputProps}
        type={visible ? 'text' : 'password'}
        className={inputClass}
        disabled={disabled}
      />
      <button
        type="button"
        className="form-password-field__toggle"
        disabled={disabled}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Passwort verbergen' : 'Passwort anzeigen'}
        aria-pressed={visible}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
};

export default PasswordField;
