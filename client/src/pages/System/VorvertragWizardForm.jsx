import { useEffect, useMemo, useState } from 'react';
import { COUNTRY_OPTIONS } from './countries';
import VorvertragGeraetPicker from './VorvertragGeraetPicker';
import MnpFieldsSection from './MnpFieldsSection';
import { patchFromImeisMonate } from './vorvertragGeraeteUtils';
import { emptyMnpDetails, validateMnpDetailsForSubmit } from './mnpConstants';
import {
  buildCustomerCatalog,
  customerPreviewLines,
  customerPatchFromEntry,
  filterCustomerCatalog
} from './vorvertragCustomerUtils';

const MONATE_OPTIONS = ['24 Monate', '36 Monate'];

const STEPS = [
  { id: 1, label: 'Grunddaten' },
  { id: 2, label: 'Kunde' },
  { id: 3, label: 'Ausgabe' },
  { id: 4, label: 'Vertrag & Details' },
  { id: 5, label: 'MNP' }
];

export default function VorvertragWizardForm({
  form,
  onChange,
  onPatch,
  onSubmit,
  onCancel,
  navbarFiliale = '',
  existingEntries = [],
  imeis = [],
  geraeteLoading = false,
  geraetSeed = '',
  saving = false
}) {
  const [step, setStep] = useState(1);
  const [kundenArt, setKundenArt] = useState('');
  const [kundeSearch, setKundeSearch] = useState('');
  const [selectedKundeKey, setSelectedKundeKey] = useState('');
  const [stepError, setStepError] = useState('');

  useEffect(() => {
    setStep(1);
    setKundenArt('');
    setKundeSearch('');
    setSelectedKundeKey('');
    setStepError('');
  }, [geraetSeed]);

  const handleChange = (field, value) => onChange(field, value);
  const handleMnpChange = (field, value) => {
    onPatch?.({
      mnpDetails: { ...(form.mnpDetails || emptyMnpDetails()), [field]: value }
    });
  };

  const catalog = useMemo(() => buildCustomerCatalog(existingEntries), [existingEntries]);
  const filteredCatalog = useMemo(
    () => filterCustomerCatalog(catalog, kundeSearch),
    [catalog, kundeSearch]
  );

  const selectExistingCustomer = (item) => {
    setSelectedKundeKey(item.key);
    onPatch?.(customerPatchFromEntry(item.entry, form));
    setStepError('');
  };

  const validateStep = (currentStep) => {
    if (currentStep === 1) {
      if (!form.datum?.trim()) return 'Bitte Datum wählen.';
      if (!navbarFiliale?.trim()) return 'Bitte zuerst eine Filiale in der Navbar wählen.';
      if (!kundenArt) return 'Bitte Kundenart wählen.';
    }
    if (currentStep === 2) {
      if (kundenArt === 'bestand' && !selectedKundeKey) return 'Bitte einen Bestandskunden auswählen.';
      if (kundenArt === 'neu' && !form.kundeVorname?.trim() && !form.kundeNachname?.trim()) {
        return 'Bitte mindestens Vor- oder Nachname eingeben.';
      }
    }
    if (currentStep === 5) {
      return validateMnpDetailsForSubmit(form.mnpDetails);
    }
    return '';
  };

  const validateAllSteps = () => {
    for (let s = 1; s <= STEPS.length; s += 1) {
      const err = validateStep(s);
      if (err) return { err, step: s };
    }
    return { err: '', step: STEPS.length };
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError('');
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const goBack = () => {
    setStepError('');
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (step !== STEPS.length) {
      setStepError('Bitte zuerst Schritt 5 (MNP) ausfüllen.');
      setStep(STEPS.length);
      return;
    }
    const { err, step: invalidStep } = validateAllSteps();
    if (err) {
      setStepError(err);
      setStep(invalidStep);
      return;
    }
    setStepError('');
    onSubmit(event);
  };

  const renderKundenArtChoice = () => (
    <div className="vorvertrag-kundenart">
      <span className="form-label">Kunde</span>
      <div className="vorvertrag-kundenart__options">
        <label className={`vorvertrag-kundenart__option${kundenArt === 'bestand' ? ' vorvertrag-kundenart__option--active' : ''}`}>
          <input
            type="radio"
            name="kundenArt"
            value="bestand"
            checked={kundenArt === 'bestand'}
            onChange={() => {
              setKundenArt('bestand');
              setSelectedKundeKey('');
              setStepError('');
            }}
          />
          <span>Bestandskunde suchen</span>
        </label>
        <label className={`vorvertrag-kundenart__option${kundenArt === 'neu' ? ' vorvertrag-kundenart__option--active' : ''}`}>
          <input
            type="radio"
            name="kundenArt"
            value="neu"
            checked={kundenArt === 'neu'}
            onChange={() => {
              setKundenArt('neu');
              setSelectedKundeKey('');
              setStepError('');
            }}
          />
          <span>Neukunde</span>
        </label>
      </div>
    </div>
  );

  const renderCustomerFields = () => (
    <div className="vorvertrag-form-grid">
      <div className="form-group">
        <label htmlFor="vv-vorname" className="form-label">Kunde Vorname</label>
        <input
          id="vv-vorname"
          type="text"
          className="form-input"
          value={form.kundeVorname}
          onChange={(ev) => handleChange('kundeVorname', ev.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="vv-nachname" className="form-label">Kunde Nachname</label>
        <input
          id="vv-nachname"
          type="text"
          className="form-input"
          value={form.kundeNachname}
          onChange={(ev) => handleChange('kundeNachname', ev.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="vv-nationalitaet" className="form-label">Nationalität</label>
        <select
          id="vv-nationalitaet"
          className="form-input"
          value={form.nationalitaet}
          onChange={(ev) => handleChange('nationalitaet', ev.target.value)}
        >
          <option value="">— Land auswählen —</option>
          {form.nationalitaet && !COUNTRY_OPTIONS.includes(form.nationalitaet) && (
            <option value={form.nationalitaet}>{form.nationalitaet}</option>
          )}
          {COUNTRY_OPTIONS.map((land) => (
            <option key={land} value={land}>{land}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="vv-pass" className="form-label">Pass / Personalausweis Nummer</label>
        <input
          id="vv-pass"
          type="text"
          className="form-input"
          value={form.passNummer}
          onChange={(ev) => handleChange('passNummer', ev.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="vv-pass-ablauf" className="form-label">Personalausweis Ablauf Datum</label>
        <input
          id="vv-pass-ablauf"
          type="date"
          className="form-input"
          value={form.passAblaufDatum}
          onChange={(ev) => handleChange('passAblaufDatum', ev.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="vv-iban" className="form-label">IBAN</label>
        <input
          id="vv-iban"
          type="text"
          className="form-input"
          value={form.iban}
          onChange={(ev) => handleChange('iban', ev.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="vv-iban-inhaber" className="form-label">Name des IBAN-Inhabers</label>
        <input
          id="vv-iban-inhaber"
          type="text"
          className="form-input"
          value={form.ibanInhaber}
          onChange={(ev) => handleChange('ibanInhaber', ev.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="vv-epos" className="form-label">ePOS-Kundenummer</label>
        <input
          id="vv-epos"
          type="text"
          className="form-input"
          value={form.eposKundenummer}
          onChange={(ev) => handleChange('eposKundenummer', ev.target.value)}
        />
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="vorvertrag-section">
      <h3 className="vorvertrag-section-title">Schritt 1 – Grunddaten</h3>
      <div className="vorvertrag-form-grid">
        <div className="form-group">
          <label htmlFor="vv-datum" className="form-label">Datum</label>
          <input
            id="vv-datum"
            type="date"
            className="form-input"
            value={form.datum}
            onChange={(ev) => handleChange('datum', ev.target.value)}
            required
          />
        </div>
        <div className="form-group vorvertrag-form-grid--full" style={{ gridColumn: '1 / -1' }}>
          {renderKundenArtChoice()}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="vorvertrag-section">
      <h3 className="vorvertrag-section-title">
        Schritt 2 – {kundenArt === 'bestand' ? 'Bestandskunde suchen' : 'Neukunde erfassen'}
      </h3>
      {kundenArt === 'bestand' ? (
        <>
          <div className="form-group">
            <label htmlFor="vv-kunde-suche" className="form-label">Kunde suchen</label>
            <input
              id="vv-kunde-suche"
              type="search"
              className="form-input"
              value={kundeSearch}
              onChange={(ev) => setKundeSearch(ev.target.value)}
              placeholder="Name, ePOS, Pass oder IBAN…"
              autoComplete="off"
            />
          </div>
          {catalog.length === 0 ? (
            <p className="vorvertrag-step-hint">Noch keine Bestandskunden aus früheren Vorverträgen vorhanden.</p>
          ) : (
            <ul className="vorvertrag-kunden-list">
              {filteredCatalog.length === 0 ? (
                <li className="vorvertrag-kunden-list__empty">Keine Treffer.</li>
              ) : (
                filteredCatalog.map((item) => {
                  const e = item.entry?.eingabeDetails || {};
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        className={`vorvertrag-kunden-list__item${selectedKundeKey === item.key ? ' vorvertrag-kunden-list__item--selected' : ''}`}
                        onClick={() => selectExistingCustomer(item)}
                      >
                        <span className="vorvertrag-kunden-list__name">{item.label}</span>
                        {e.eposKundenummer ? (
                          <span className="vorvertrag-kunden-list__meta">ePOS: {e.eposKundenummer}</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          )}
          {selectedKundeKey ? (
            <div className="vorvertrag-kunden-preview">
              <h4 className="vorvertrag-kunden-preview__title">Übernommene Kundendaten</h4>
              <dl className="vorvertrag-kunden-preview__grid">
                {customerPreviewLines(form).map(([label, value]) => (
                  <div key={label} className="vorvertrag-kunden-preview__row">
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </>
      ) : (
        renderCustomerFields()
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="vorvertrag-section">
      <h3 className="vorvertrag-section-title">Schritt 3 – Ausgabe Details</h3>
      <div className="vorvertrag-form-grid">
        <div className="form-group vorvertrag-form-grid--full" style={{ gridColumn: '1 / -1' }}>
          <VorvertragGeraetPicker
            key={`wizard-${geraetSeed || 'new'}`}
            imeis={imeis}
            seedGeraet={geraetSeed}
            selectedGeraet={form.ausgabeGeraet}
            selectedFarbe={form.ausgabeFarbe}
            onGeraetChange={(value) => handleChange('ausgabeGeraet', value)}
            onFarbeChange={(value) => handleChange('ausgabeFarbe', value)}
            loading={geraeteLoading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="vv-verfuegbarkeit" className="form-label">Verfügbarkeit</label>
          <select
            id="vv-verfuegbarkeit"
            className="form-input"
            value={form.ausgabeVerfuegbarkeit}
            onChange={(ev) => handleChange('ausgabeVerfuegbarkeit', ev.target.value)}
          >
            <option value="">— auswählen —</option>
            <option value="bestellen">Bestellen</option>
            <option value="in_shop">Im Shop</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <>
      <div className="vorvertrag-section">
        <h3 className="vorvertrag-section-title">Schritt 4 – Anschluss &amp; Zuzahlung</h3>
        <div className="vorvertrag-ja-nein-row">
          <div className="form-group">
            <label htmlFor="vv-anschluss" className="form-label">Anschluss?</label>
            <select
              id="vv-anschluss"
              className="form-input"
              value={form.anschlussJaNein}
              onChange={(ev) => handleChange('anschlussJaNein', ev.target.value)}
            >
              <option value="nein">Nein</option>
              <option value="ja">Ja</option>
            </select>
          </div>
          {form.anschlussJaNein === 'ja' && (
            <div className="form-group form-group--grow">
              <label htmlFor="vv-anschluss-wert" className="form-label">Anschluss Wert</label>
              <input
                id="vv-anschluss-wert"
                type="text"
                className="form-input"
                value={form.anschlussWert}
                onChange={(ev) => handleChange('anschlussWert', ev.target.value)}
              />
            </div>
          )}
        </div>
        <div className="vorvertrag-ja-nein-row vorvertrag-ja-nein-row--spaced">
          <div className="form-group">
            <label htmlFor="vv-zuzahlung" className="form-label">Zuzahlung?</label>
            <select
              id="vv-zuzahlung"
              className="form-input"
              value={form.zuzahlungJaNein}
              onChange={(ev) => handleChange('zuzahlungJaNein', ev.target.value)}
            >
              <option value="nein">Nein</option>
              <option value="ja">Ja</option>
            </select>
          </div>
          {form.zuzahlungJaNein === 'ja' && (
            <div className="form-group form-group--grow">
              <label htmlFor="vv-zuzahlung-wert" className="form-label">Zuzahlung Wert</label>
              <input
                id="vv-zuzahlung-wert"
                type="text"
                className="form-input"
                value={form.zuzahlungWert}
                onChange={(ev) => handleChange('zuzahlungWert', ev.target.value)}
              />
            </div>
          )}
        </div>
      </div>
      <div className="vorvertrag-section">
        <h3 className="vorvertrag-section-title">Weitere Details</h3>
        <div className="vorvertrag-form-grid">
          <div className="form-group">
            <label htmlFor="vv-imeis-monate" className="form-label">IMEIs – 24/36 Monaten</label>
            <select
              id="vv-imeis-monate"
              className="form-input"
              value={form.imeisMonate}
              onChange={(ev) => onPatch?.(patchFromImeisMonate(ev.target.value))}
            >
              <option value="">— keine Auswahl —</option>
              {MONATE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="vv-hw-voucher" className="form-label">HW-Voucher</label>
            <select
              id="vv-hw-voucher"
              className="form-input"
              value={form.hwVoucher}
              onChange={(ev) => handleChange('hwVoucher', ev.target.value)}
            >
              <option value="">— keine Auswahl —</option>
              {MONATE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="form-group vorvertrag-checkbox-field">
            <span className="form-label">Kombi</span>
            <label className="vorvertrag-checkbox-field__control" htmlFor="vv-kombi">
              <input
                id="vv-kombi"
                type="checkbox"
                checked={form.kombi === 'Mit'}
                onChange={(ev) => handleChange('kombi', ev.target.checked ? 'Mit' : 'Ohne')}
              />
              <span className="vorvertrag-checkbox-field__value">{form.kombi}</span>
            </label>
          </div>
          <div className="form-group vorvertrag-checkbox-field">
            <span className="form-label">VVL</span>
            <label className="vorvertrag-checkbox-field__control" htmlFor="vv-vvl">
              <input
                id="vv-vvl"
                type="checkbox"
                checked={form.vvl === 'Mit'}
                onChange={(ev) => handleChange('vvl', ev.target.checked ? 'Mit' : 'Ohne')}
              />
              <span className="vorvertrag-checkbox-field__value">{form.vvl}</span>
            </label>
          </div>
          <div className="form-group vorvertrag-form-grid--full" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="vv-notiz" className="form-label">Notiz</label>
            <textarea
              id="vv-notiz"
              className="form-input"
              rows={3}
              value={form.notiz}
              onChange={(ev) => handleChange('notiz', ev.target.value)}
            />
          </div>
        </div>
      </div>
    </>
  );

  const renderStep5 = () => (
    <>
      <p className="vorvertrag-step-hint">
        Pflichtfelder: Postpaid/Prepaid, MNP-Details, freigegeben?, MNP Typ. Erst danach wird die Karte erstellt.
      </p>
      <MnpFieldsSection
        details={form.mnpDetails}
        onChange={handleMnpChange}
        idPrefix="vv-wizard-mnp"
        showTitle={false}
      />
    </>
  );

  return (
    <form
      className="vorvertrag-panel vorvertrag-form-panel vorvertrag-form-panel--wizard"
      onSubmit={handleSubmit}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && step !== STEPS.length) {
          event.preventDefault();
        }
      }}
    >
      <div className="vorvertrag-form-panel__head">
        <h2>Neuer Vorvertrag</h2>
        {onCancel ? (
          <button type="button" className="btn btn--secondary btn--small" onClick={onCancel}>
            Abbrechen
          </button>
        ) : null}
      </div>

      <ol className="vorvertrag-steps" aria-label="Formularschritte">
        {STEPS.map(({ id, label }) => (
          <li
            key={id}
            className={`vorvertrag-steps__item${step === id ? ' vorvertrag-steps__item--active' : ''}${step > id ? ' vorvertrag-steps__item--done' : ''}`}
          >
            <span className="vorvertrag-steps__num">{id}</span>
            <span className="vorvertrag-steps__label">{label}</span>
          </li>
        ))}
      </ol>

      {stepError ? <p className="vorvertrag-step-error" role="alert">{stepError}</p> : null}

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step === 5 && renderStep5()}

      <div className="vorvertrag-actions vorvertrag-actions--wizard">
        {step > 1 ? (
          <button type="button" className="btn btn--secondary" onClick={goBack} disabled={saving}>
            Zurück
          </button>
        ) : (
          <span />
        )}
        {step < STEPS.length ? (
          <button type="button" className="btn btn--primary" onClick={goNext} disabled={saving}>
            Weiter
          </button>
        ) : (
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Speichern…' : 'Vorvertrag einreichen'}
          </button>
        )}
      </div>
    </form>
  );
}
