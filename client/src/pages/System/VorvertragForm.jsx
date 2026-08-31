import { COUNTRY_OPTIONS } from './countries';
import { parseAusgabeDetails, normalizeMitOhne, patchFromImeisMonate } from './vorvertragGeraeteUtils';
import VorvertragGeraetPicker from './VorvertragGeraetPicker';
import VorvertragWizardForm from './VorvertragWizardForm';
import MnpFieldsSection from './MnpFieldsSection';
import { emptyMnpDetails, mnpDetailsFromEingabe } from './mnpConstants';
import { FILIALE_OPTIONS, normalizeEinsatzOrt } from '../../constants/einsatzorte';

const MONATE_OPTIONS = ['24 Monate', '36 Monate'];

export const emptyVorvertragForm = () => ({
  datum: new Date().toISOString().slice(0, 10),
  filiale: '',
  kundeVorname: '',
  kundeNachname: '',
  ausgabeGeraet: '',
  ausgabeFarbe: '',
  ausgabeVerfuegbarkeit: '',
  anschlussJaNein: 'nein',
  anschlussWert: '',
  zuzahlungJaNein: 'nein',
  zuzahlungWert: '',
  nationalitaet: '',
  passNummer: '',
  passAblaufDatum: '',
  iban: '',
  ibanInhaber: '',
  imeisMonate: '',
  hwVoucher: '',
  kombi: 'Ohne',
  vvl: 'Ohne',
  eposKundenummer: '',
  mnpDetails: emptyMnpDetails(),
  notiz: ''
});

export function formFromEntry(entry) {
  const e = entry?.eingabeDetails || {};
  const ausgabe = parseAusgabeDetails(entry?.ausgabeDetails);
  return {
    datum: entry?.datum || '',
    filiale: normalizeEinsatzOrt(entry?.filiale) || entry?.filiale || '',
    kundeVorname: entry?.kundeVorname || '',
    kundeNachname: entry?.kundeNachname || '',
    ausgabeGeraet: ausgabe.geraet,
    ausgabeFarbe: ausgabe.farbe,
    ausgabeVerfuegbarkeit: ausgabe.verfuegbarkeit,
    anschlussJaNein: entry?.anschluss?.jaNein || 'nein',
    anschlussWert: entry?.anschluss?.wert || '',
    zuzahlungJaNein: entry?.zuzahlung?.jaNein || 'nein',
    zuzahlungWert: entry?.zuzahlung?.wert || '',
    nationalitaet: e.nationalitaet || '',
    passNummer: e.passNummer || '',
    passAblaufDatum: e.passAblaufDatum || '',
    iban: e.iban || '',
    ibanInhaber: e.ibanInhaber || '',
    imeisMonate: e.imeisMonate || '',
    hwVoucher: e.hwVoucher || '',
    kombi: normalizeMitOhne(e.kombi),
    vvl: normalizeMitOhne(e.vvl),
    eposKundenummer: e.eposKundenummer || '',
    mnpDetails: mnpDetailsFromEingabe(e),
    notiz: e.notiz || ''
  };
}

export function buildVorvertragPayload(form) {
  return {
    entryType: 'vorvertrag',
    datum: form.datum,
    filiale: form.filiale,
    kundeVorname: form.kundeVorname,
    kundeNachname: form.kundeNachname,
    ausgabeDetails: {
      geraet: form.ausgabeGeraet,
      farbe: form.ausgabeFarbe,
      verfuegbarkeit: form.ausgabeVerfuegbarkeit
    },
    anschlussJaNein: form.anschlussJaNein,
    anschlussWert: form.anschlussWert,
    zuzahlungJaNein: form.zuzahlungJaNein,
    zuzahlungWert: form.zuzahlungWert,
    eingabeDetails: {
      nationalitaet: form.nationalitaet,
      passNummer: form.passNummer,
      passAblaufDatum: form.passAblaufDatum,
      iban: form.iban,
      ibanInhaber: form.ibanInhaber,
      imeisMonate: form.imeisMonate,
      hwVoucher: form.hwVoucher,
      kombi: form.kombi,
      vvl: form.vvl,
      eposKundenummer: form.eposKundenummer,
      mnpDetails: form.mnpDetails,
      notiz: form.notiz
    }
  };
}

export default function VorvertragForm({
  form,
  onChange,
  onPatch,
  onSubmit,
  onCancel,
  filialeOptions = FILIALE_OPTIONS,
  navbarFiliale = '',
  existingEntries = [],
  archivedEntries = [],
  imeis = [],
  geraeteLoading = false,
  geraetSeed = '',
  saving = false,
  mode = 'new',
  ticketId = ''
}) {
  if (mode === 'new') {
    return (
      <VorvertragWizardForm
        form={form}
        onChange={onChange}
        onPatch={onPatch}
        onSubmit={onSubmit}
        onCancel={onCancel}
        navbarFiliale={navbarFiliale}
        archivedEntries={archivedEntries}
        imeis={imeis}
        geraeteLoading={geraeteLoading}
        geraetSeed={geraetSeed}
        saving={saving}
      />
    );
  }

  const handleChange = (field, value) => onChange(field, value);
  const handleMnpChange = (field, value) => {
    onPatch?.({
      mnpDetails: { ...(form.mnpDetails || emptyMnpDetails()), [field]: value }
    });
  };

  return (
    <form className="vorvertrag-panel vorvertrag-form-panel" onSubmit={onSubmit}>
      <div className="vorvertrag-form-panel__head">
        <div className="vorvertrag-form-panel__title">
          <h2>Vorvertrag bearbeiten</h2>
          {ticketId ? <p className="vorvertrag-ticket-id">{ticketId}</p> : null}
        </div>
        {onCancel ? (
          <button type="button" className="btn btn--secondary btn--small" onClick={onCancel}>
            Abbrechen
          </button>
        ) : null}
      </div>

      <div className="vorvertrag-section">
        <h3 className="vorvertrag-section-title">Allgemein</h3>
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
          <div className="form-group vorvertrag-filiale-field">
            <label htmlFor="vv-filiale" className="form-label">Filiale</label>
            <div className="vorvertrag-filiale-field__control">
              <select
                id="vv-filiale"
                className="form-input vorvertrag-filiale-select"
                value={form.filiale}
                onChange={(ev) => handleChange('filiale', ev.target.value)}
                required
              >
              <option value="">— auswählen —</option>
              {filialeOptions.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
              </select>
            </div>
          </div>
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
        </div>
      </div>

      <div className="vorvertrag-section">
        <h3 className="vorvertrag-section-title">Ausgabe Details</h3>
        <div className="vorvertrag-form-grid">
          <div className="form-group vorvertrag-form-grid--full" style={{ gridColumn: '1 / -1' }}>
            <VorvertragGeraetPicker
              key={`${mode}-${geraetSeed || 'new'}`}
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

      <div className="vorvertrag-section">
        <h3 className="vorvertrag-section-title">Anschluss &amp; Zuzahlung</h3>
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
        <h3 className="vorvertrag-section-title">Eingabe Details</h3>
        <div className="vorvertrag-form-grid">
          <div className="form-group">
            <label htmlFor="vv-nationalitaet" className="form-label">Nationalität</label>
            <select
              id="vv-nationalitaet"
              className="form-input"
              value={form.nationalitaet}
              onChange={(ev) => handleChange('nationalitaet', ev.target.value)}
            >
              <option value="">— Land auswählen —</option>
              {form.nationalitaet &&
                !COUNTRY_OPTIONS.includes(form.nationalitaet) && (
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

      <MnpFieldsSection
        details={form.mnpDetails}
        onChange={handleMnpChange}
        idPrefix="vv-mnp"
      />

      <div className="vorvertrag-actions">
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Speichern…' : mode === 'edit' ? 'Änderungen speichern' : 'Vorvertrag einreichen'}
        </button>
      </div>
    </form>
  );
}
