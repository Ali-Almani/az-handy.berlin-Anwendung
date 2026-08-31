import { useState } from 'react';
import MnpFieldsSection from './MnpFieldsSection';
import {
  emptyMnpDetails,
  mnpDetailsFromEingabe,
  validateMnpDetailsForSubmit
} from './mnpConstants';
import { FILIALE_OPTIONS, normalizeEinsatzOrt } from '../../constants/einsatzorte';
import { VORVERTRAG_ENTRY_TYPE_MNP } from './vorvertragEntryType';

export const emptyMnpForm = () => ({
  datum: new Date().toISOString().slice(0, 10),
  filiale: '',
  mnpDetails: emptyMnpDetails()
});

export function formFromMnpEntry(entry) {
  const e = entry?.eingabeDetails || {};
  return {
    datum: entry?.datum || '',
    filiale: normalizeEinsatzOrt(entry?.filiale) || entry?.filiale || '',
    mnpDetails: mnpDetailsFromEingabe(e)
  };
}

export function buildMnpPayload(form) {
  const mnp = form.mnpDetails || emptyMnpDetails();
  return {
    entryType: VORVERTRAG_ENTRY_TYPE_MNP,
    datum: form.datum,
    filiale: form.filiale,
    kundeVorname: mnp.kundenVorname || '',
    kundeNachname: mnp.kundenNachname || '',
    ausgabeDetails: {
      geraet: '',
      farbe: '',
      verfuegbarkeit: ''
    },
    anschlussJaNein: 'nein',
    anschlussWert: '',
    zuzahlungJaNein: 'nein',
    zuzahlungWert: '',
    eingabeDetails: {
      mnpDetails: mnp
    }
  };
}

export default function MnpForm({
  form,
  onPatch,
  onSubmit,
  onCancel,
  filialeOptions = FILIALE_OPTIONS,
  navbarFiliale = '',
  saving = false,
  mode = 'new',
  ticketId = ''
}) {
  const [validationError, setValidationError] = useState('');

  const handleMnpChange = (field, value) => {
    setValidationError('');
    onPatch?.({
      mnpDetails: { ...(form.mnpDetails || emptyMnpDetails()), [field]: value }
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const err = validateMnpDetailsForSubmit(form.mnpDetails);
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError('');
    onSubmit(event);
  };

  return (
    <form className="vorvertrag-panel vorvertrag-form-panel" onSubmit={handleSubmit}>
      <div className="vorvertrag-form-panel__head">
        <div className="vorvertrag-form-panel__title">
          <h2>{mode === 'edit' ? 'MNP bearbeiten' : 'Neues MNP'}</h2>
          {ticketId ? <p className="vorvertrag-ticket-id">{ticketId}</p> : null}
        </div>
        {onCancel ? (
          <button type="button" className="btn btn--secondary btn--small" onClick={onCancel}>
            Abbrechen
          </button>
        ) : null}
      </div>

      <MnpFieldsSection
        details={form.mnpDetails}
        onChange={handleMnpChange}
        idPrefix="mnp-form"
        showTitle={false}
        extraGeneralFields={(
          <>
            <div className="form-group">
              <label htmlFor="mnp-datum" className="form-label form-label--required">Datum</label>
              <input
                id="mnp-datum"
                type="date"
                className="form-input"
                value={form.datum}
                onChange={(ev) => {
                  setValidationError('');
                  onPatch?.({ datum: ev.target.value });
                }}
                required
              />
            </div>
            {mode === 'edit' ? (
              <div className="form-group vorvertrag-filiale-field">
                <label htmlFor="mnp-filiale" className="form-label form-label--required">Filiale</label>
                <div className="vorvertrag-filiale-field__control">
                  <select
                    id="mnp-filiale"
                    className="form-input vorvertrag-filiale-select"
                    value={form.filiale}
                    onChange={(ev) => onPatch?.({ filiale: ev.target.value })}
                    required
                  >
                    <option value="">— auswählen —</option>
                    {filialeOptions.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : navbarFiliale ? (
              <div className="form-group">
                <span className="form-label form-label--required">Filiale</span>
                <p className="vorvertrag-step-hint">{navbarFiliale}</p>
              </div>
            ) : null}
          </>
        )}
      />

      {validationError ? (
        <p className="vorvertrag-step-error" role="alert">{validationError}</p>
      ) : null}

      <div className="vorvertrag-actions">
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Speichern…' : mode === 'edit' ? 'Änderungen speichern' : 'MNP einreichen'}
        </button>
      </div>
    </form>
  );
}
