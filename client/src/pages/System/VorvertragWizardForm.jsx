import { useEffect, useMemo, useState } from 'react';
import { COUNTRY_OPTIONS } from './countries';
import VorvertragGeraetPicker from './VorvertragGeraetPicker';
import MnpFieldsSection from './MnpFieldsSection';
import { patchFromImeisMonate, buildFarbenForGeraet } from './vorvertragGeraeteUtils';
import { emptyMnpDetails, validateMnpDetailsForSubmit } from './mnpConstants';
import {
  buildCustomerCatalog,
  filterCustomerCatalogByName,
  wizardPatchFromArchiveEntry
} from './vorvertragCustomerUtils';
import { formatEinsatzOrt } from '../../constants/einsatzorte';

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
  archivedEntries = [],
  imeis = [],
  geraeteLoading = false,
  geraetSeed = '',
  saving = false
}) {
  const [step, setStep] = useState(1);
  const [kundenArt, setKundenArt] = useState('');
  const [mitMnp, setMitMnp] = useState('');
  const [kundeSearch, setKundeSearch] = useState('');
  const [selectedKundeKey, setSelectedKundeKey] = useState('');
  const [stepError, setStepError] = useState('');

  useEffect(() => {
    setStep(1);
    setKundenArt('');
    setMitMnp('');
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

  const catalog = useMemo(() => buildCustomerCatalog(archivedEntries), [archivedEntries]);
  const filteredCatalog = useMemo(
    () => filterCustomerCatalogByName(catalog, kundeSearch),
    [catalog, kundeSearch]
  );

  const selectExistingCustomer = (item) => {
    setSelectedKundeKey(item.key);
    onPatch?.(wizardPatchFromArchiveEntry(item.entry, form));
    setStepError('');
  };

  const renderArchiveCustomerSearch = () => (
    <div className="vorvertrag-archive-search">
      <div className="form-group">
        <label htmlFor="vv-kunde-suche" className="form-label form-label--required">Kunde im Archiv suchen</label>
        <input
          id="vv-kunde-suche"
          type="search"
          className="form-input"
          value={kundeSearch}
          onChange={(ev) => setKundeSearch(ev.target.value)}
          placeholder="Nach Kundenname suchen…"
          autoComplete="off"
        />
      </div>
      {catalog.length === 0 ? (
        <p className="vorvertrag-step-hint">Im Archiv sind noch keine erledigten Vorverträge mit Kundennamen vorhanden.</p>
      ) : !kundeSearch.trim() ? (
        <p className="vorvertrag-step-hint">Bitte einen Kundenname eingeben, um im Archiv zu suchen.</p>
      ) : (
        <ul className="vorvertrag-kunden-list">
          {filteredCatalog.length === 0 ? (
            <li className="vorvertrag-kunden-list__empty">Keine Treffer im Archiv.</li>
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
                    <span className="vorvertrag-kunden-list__meta">
                      {[formatEinsatzOrt(item.entry?.filiale), item.entry?.datum, e.eposKundenummer ? `ePOS: ${e.eposKundenummer}` : '']
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
      {selectedKundeKey ? (
        <p className="vorvertrag-step-hint vorvertrag-step-hint--success">
          Kundendaten aus dem Archiv übernommen. Sie können alle Felder in den nächsten Schritten anpassen.
        </p>
      ) : null}
    </div>
  );

  const validateStep = (currentStep) => {
    if (currentStep === 1) {
      if (!form.datum?.trim()) return 'Bitte Datum wählen.';
      if (!navbarFiliale?.trim()) return 'Bitte zuerst eine Filiale in der Navbar wählen.';
      if (!kundenArt) return 'Bitte Kundenart wählen.';
      if (kundenArt === 'bestand' && !selectedKundeKey) {
        return 'Bitte einen Bestandskunden aus dem Archiv auswählen.';
      }
    }
    if (currentStep === 2) {
      if (kundenArt === 'bestand' && !selectedKundeKey) return 'Bitte einen Bestandskunden auswählen.';
      if (kundenArt === 'neu' && !form.kundeVorname?.trim() && !form.kundeNachname?.trim()) {
        return 'Bitte mindestens Vor- oder Nachname eingeben.';
      }
    }
    if (currentStep === 3) {
      if (!form.ausgabeGeraet?.trim()) return 'Bitte Gerät wählen.';
      const farben = buildFarbenForGeraet(imeis, form.ausgabeGeraet);
      if (farben.length > 0 && !form.ausgabeFarbe?.trim()) return 'Bitte Farbe wählen.';
      if (!form.ausgabeVerfuegbarkeit?.trim()) return 'Bitte Verfügbarkeit wählen.';
    }
    if (currentStep === 5) {
      if (!mitMnp) return 'Bitte wählen, ob MNP durchgeführt wird.';
      if (mitMnp === 'ja') return validateMnpDetailsForSubmit(form.mnpDetails);
    }
    return '';
  };

  const validateStepsUpTo = (maxStep) => {
    for (let s = 1; s <= maxStep; s += 1) {
      const err = validateStep(s);
      if (err) return { err, step: s };
    }
    return { err: '', step: maxStep };
  };

  const validateAllSteps = () => {
    for (let s = 1; s <= STEPS.length; s += 1) {
      const err = validateStep(s);
      if (err) return { err, step: s };
    }
    return { err: '', step: STEPS.length };
  };

  const setMitMnpChoice = (value) => {
    setMitMnp(value);
    setStepError('');
    if (value === 'nein') {
      onPatch?.({ mnpDetails: emptyMnpDetails() });
    }
  };

  const goNext = () => {
    const { err, step: invalidStep } = validateStepsUpTo(step);
    if (err) {
      setStepError(err);
      if (invalidStep !== step) setStep(invalidStep);
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
      setStepError('Bitte alle Schritte durchlaufen.');
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

  const renderMitMnpChoice = () => (
    <div className="vorvertrag-kundenart">
      <span className="form-label form-label--required">Mit MNP?</span>
      <div className="vorvertrag-kundenart__options">
        <label className={`vorvertrag-kundenart__option${mitMnp === 'ja' ? ' vorvertrag-kundenart__option--active' : ''}`}>
          <input
            type="radio"
            name="mitMnp"
            value="ja"
            checked={mitMnp === 'ja'}
            onChange={() => setMitMnpChoice('ja')}
          />
          <span>Ja</span>
        </label>
        <label className={`vorvertrag-kundenart__option${mitMnp === 'nein' ? ' vorvertrag-kundenart__option--active' : ''}`}>
          <input
            type="radio"
            name="mitMnp"
            value="nein"
            checked={mitMnp === 'nein'}
            onChange={() => setMitMnpChoice('nein')}
          />
          <span>Nein</span>
        </label>
      </div>
    </div>
  );

  const renderKundenArtChoice = () => (
    <div className="vorvertrag-kundenart">
      <span className="form-label form-label--required">Kunde</span>
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
              setKundeSearch('');
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
              setKundeSearch('');
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
        <label
          htmlFor="vv-vorname"
          className={`form-label${kundenArt === 'neu' ? ' form-label--required' : ''}`}
        >
          Kunde Vorname
        </label>
        <input
          id="vv-vorname"
          type="text"
          className="form-input"
          value={form.kundeVorname}
          onChange={(ev) => handleChange('kundeVorname', ev.target.value)}
        />
      </div>
      <div className="form-group">
        <label
          htmlFor="vv-nachname"
          className={`form-label${kundenArt === 'neu' ? ' form-label--required' : ''}`}
        >
          Kunde Nachname
        </label>
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
          <label htmlFor="vv-datum" className="form-label form-label--required">Datum</label>
          <input
            id="vv-datum"
            type="date"
            className="form-input"
            value={form.datum}
            onChange={(ev) => handleChange('datum', ev.target.value)}
            required
          />
        </div>
        <div className="form-group vorvertrag-form-grid--full">
          {renderKundenArtChoice()}
        </div>
        {kundenArt === 'bestand' ? (
          <div className="form-group vorvertrag-form-grid--full">
            {renderArchiveCustomerSearch()}
          </div>
        ) : null}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="vorvertrag-section">
      <h3 className="vorvertrag-section-title">
        Schritt 2 – {kundenArt === 'bestand' ? 'Kundendaten prüfen & anpassen' : 'Neukunde erfassen'}
      </h3>
      {renderCustomerFields()}
    </div>
  );

  const renderStep3 = () => (
    <div className="vorvertrag-section">
      <h3 className="vorvertrag-section-title">Schritt 3 – Ausgabe Details</h3>
      <div className="vorvertrag-form-grid">
        <div className="form-group vorvertrag-form-grid--full">
          <VorvertragGeraetPicker
            key={`wizard-${geraetSeed || 'new'}`}
            imeis={imeis}
            seedGeraet={geraetSeed}
            selectedGeraet={form.ausgabeGeraet}
            selectedFarbe={form.ausgabeFarbe}
            onGeraetChange={(value) => handleChange('ausgabeGeraet', value)}
            onFarbeChange={(value) => handleChange('ausgabeFarbe', value)}
            loading={geraeteLoading}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="vv-verfuegbarkeit" className="form-label form-label--required">Verfügbarkeit</label>
          <select
            id="vv-verfuegbarkeit"
            className="form-input"
            value={form.ausgabeVerfuegbarkeit}
            onChange={(ev) => handleChange('ausgabeVerfuegbarkeit', ev.target.value)}
            required
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
          <div className="form-group vorvertrag-form-grid--full">
            <label htmlFor="vv-notiz" className="form-label">Notiz</label>
            <textarea
              id="vv-notiz"
              className="form-input"
              rows={2}
              value={form.notiz}
              onChange={(ev) => handleChange('notiz', ev.target.value)}
            />
          </div>
        </div>
      </div>
    </>
  );

  const renderStep5 = () => (
    <div className="vorvertrag-section">
      {renderMitMnpChoice()}
      {mitMnp === 'nein' ? (
        <p className="vorvertrag-step-hint">
          Kein MNP – Sie können den Vorvertrag jetzt einreichen.
        </p>
      ) : null}
      {mitMnp === 'ja' ? (
          <MnpFieldsSection
            details={form.mnpDetails}
            onChange={handleMnpChange}
            idPrefix="vv-wizard-mnp"
            showTitle={false}
          />
      ) : null}
    </div>
  );

  return (
    <form
      className="vorvertrag-panel vorvertrag-form-panel vorvertrag-form-panel--wizard"
      onSubmit={handleSubmit}
      onKeyDown={(event) => {
        if (event.key !== 'Enter') return;
        if (step < STEPS.length) {
          event.preventDefault();
          goNext();
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
