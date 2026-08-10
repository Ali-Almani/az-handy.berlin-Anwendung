import { FILIALE_OPTIONS } from '../../constants/einsatzorte';
import {
  MNP_DETAILS_OPTIONS,
  MNP_FREIGEGEBEN_OPTIONS,
  MNP_POSTPAID_OPTIONS,
  MNP_STATUS_OPTIONS,
  MNP_TYP_OPTIONS
} from './mnpConstants';

export const emptyMnpForm = () => ({
  filiale: '',
  mitarbeiter: '',
  neuesVertragsdatum: new Date().toISOString().slice(0, 10),
  neueO2Rufnummer: '',
  eposKn: '',
  iban: '',
  letzten7SimKarte: '',
  kundenVorname: '',
  kundenNachname: '',
  kundenGeburtsdatum: '',
  kundenAktuellKontaktNummer: '',
  kundenVollstaendigeAdresse: '',
  mnpRufnummer: '',
  originalAnbieter: '',
  postpaidPrepaid: '',
  mnpDetails: '',
  mnpAltKundenVorname: '',
  mnpAltKundenNachname: '',
  mnpAltKundenGeburtsdatum: '',
  freigegebenNachVertragsende: '',
  mnpTyp: '',
  status: 'Offen',
  mnpBestaetigungsdatum: '',
  notiz: ''
});

export function formFromMnpEntry(entry) {
  return {
    filiale: entry?.filiale || '',
    mitarbeiter: entry?.mitarbeiter || entry?.mitarbeiterName || '',
    neuesVertragsdatum: entry?.neuesVertragsdatum || '',
    neueO2Rufnummer: entry?.neueO2Rufnummer || '',
    eposKn: entry?.eposKn || '',
    iban: entry?.iban || '',
    letzten7SimKarte: entry?.letzten7SimKarte || '',
    kundenVorname: entry?.kundenVorname || '',
    kundenNachname: entry?.kundenNachname || '',
    kundenGeburtsdatum: entry?.kundenGeburtsdatum || '',
    kundenAktuellKontaktNummer: entry?.kundenAktuellKontaktNummer || '',
    kundenVollstaendigeAdresse: entry?.kundenVollstaendigeAdresse || '',
    mnpRufnummer: entry?.mnpRufnummer || '',
    originalAnbieter: entry?.originalAnbieter || '',
    postpaidPrepaid: entry?.postpaidPrepaid || '',
    mnpDetails: entry?.mnpDetails || '',
    mnpAltKundenVorname: entry?.mnpAltKundenVorname || '',
    mnpAltKundenNachname: entry?.mnpAltKundenNachname || '',
    mnpAltKundenGeburtsdatum: entry?.mnpAltKundenGeburtsdatum || '',
    freigegebenNachVertragsende: entry?.freigegebenNachVertragsende || '',
    mnpTyp: entry?.mnpTyp || '',
    status: entry?.status || 'Offen',
    mnpBestaetigungsdatum: entry?.mnpBestaetigungsdatum || '',
    notiz: entry?.notiz || ''
  };
}

export function buildMnpPayload(form) {
  return { ...form };
}

function SelectField({ id, label, value, options, onChange, required = false }) {
  return (
    <div className="form-group">
      <label htmlFor={id} className="form-label">{label}</label>
      <select
        id={id}
        className="form-input"
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        required={required}
      >
        <option value="">— auswählen —</option>
        {value && !options.includes(value) ? (
          <option value={value}>{value}</option>
        ) : null}
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function TextField({ id, label, value, onChange, type = 'text', required = false }) {
  return (
    <div className="form-group">
      <label htmlFor={id} className="form-label">{label}</label>
      <input
        id={id}
        type={type}
        className="form-input"
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        required={required}
      />
    </div>
  );
}

export default function MnpForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  filialeOptions = FILIALE_OPTIONS,
  navbarFiliale = '',
  saving = false,
  mode = 'new'
}) {
  const handleChange = (field, value) => onChange(field, value);
  const filialeLocked = mode === 'new' && Boolean(navbarFiliale);

  return (
    <form className="vorvertrag-panel vorvertrag-form-panel" onSubmit={onSubmit}>
      <div className="vorvertrag-form-panel__head">
        <h2>{mode === 'edit' ? 'MNP bearbeiten' : 'Neuer MNP-Eintrag'}</h2>
        {onCancel ? (
          <button type="button" className="btn btn--secondary btn--small" onClick={onCancel}>
            Abbrechen
          </button>
        ) : null}
      </div>

      <div className="vorvertrag-section">
        <h3 className="vorvertrag-section-title">Allgemein</h3>
        <div className="vorvertrag-form-grid">
          <TextField
            id="mnp-mitarbeiter"
            label="Mitarbeiter"
            value={form.mitarbeiter}
            onChange={(v) => handleChange('mitarbeiter', v)}
          />
          <TextField
            id="mnp-neues-vertragsdatum"
            label="Neues Vertragsdatum"
            type="date"
            value={form.neuesVertragsdatum}
            onChange={(v) => handleChange('neuesVertragsdatum', v)}
            required
          />
          <div className="form-group vorvertrag-filiale-field">
            <label htmlFor="mnp-filiale" className="form-label">Filiale</label>
            <div className="vorvertrag-filiale-field__control">
              <select
                id="mnp-filiale"
                className="form-input vorvertrag-filiale-select"
                value={filialeLocked ? navbarFiliale : form.filiale}
                onChange={(ev) => handleChange('filiale', ev.target.value)}
                disabled={filialeLocked}
                required
              >
                <option value="">— auswählen —</option>
                {filialeOptions.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>
          <SelectField
            id="mnp-status"
            label="Status"
            value={form.status}
            options={MNP_STATUS_OPTIONS}
            onChange={(v) => handleChange('status', v)}
            required
          />
        </div>
      </div>

      <div className="vorvertrag-section">
        <h3 className="vorvertrag-section-title">Vertrag &amp; Kontakt</h3>
        <div className="vorvertrag-form-grid">
          <TextField
            id="mnp-neue-o2"
            label="Neue O2 Rufnummer"
            value={form.neueO2Rufnummer}
            onChange={(v) => handleChange('neueO2Rufnummer', v)}
          />
          <TextField
            id="mnp-epos-kn"
            label="ePOS KN"
            value={form.eposKn}
            onChange={(v) => handleChange('eposKn', v)}
          />
          <TextField
            id="mnp-iban"
            label="IBAN"
            value={form.iban}
            onChange={(v) => handleChange('iban', v)}
          />
          <TextField
            id="mnp-sim7"
            label="letzten 7 von SIM karte"
            value={form.letzten7SimKarte}
            onChange={(v) => handleChange('letzten7SimKarte', v)}
          />
        </div>
      </div>

      <div className="vorvertrag-section">
        <h3 className="vorvertrag-section-title">Kunde</h3>
        <div className="vorvertrag-form-grid">
          <TextField
            id="mnp-k-vorname"
            label="Kunden Vorname"
            value={form.kundenVorname}
            onChange={(v) => handleChange('kundenVorname', v)}
          />
          <TextField
            id="mnp-k-nachname"
            label="Kunden Nachname"
            value={form.kundenNachname}
            onChange={(v) => handleChange('kundenNachname', v)}
          />
          <TextField
            id="mnp-k-geb"
            label="Kunden Geburtsdatum"
            type="date"
            value={form.kundenGeburtsdatum}
            onChange={(v) => handleChange('kundenGeburtsdatum', v)}
          />
          <TextField
            id="mnp-k-kontakt"
            label="Kunden Aktuell Kontakt nummer"
            value={form.kundenAktuellKontaktNummer}
            onChange={(v) => handleChange('kundenAktuellKontaktNummer', v)}
          />
          <div className="form-group vorvertrag-form-grid--full" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="mnp-k-adresse" className="form-label">Kunden Vollständige Adresse (ePOS)</label>
            <textarea
              id="mnp-k-adresse"
              className="form-input"
              rows={2}
              value={form.kundenVollstaendigeAdresse}
              onChange={(ev) => handleChange('kundenVollstaendigeAdresse', ev.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="vorvertrag-section">
        <h3 className="vorvertrag-section-title">MNP-Details</h3>
        <div className="vorvertrag-form-grid">
          <TextField
            id="mnp-rufnummer"
            label="MNP Rufnummer"
            value={form.mnpRufnummer}
            onChange={(v) => handleChange('mnpRufnummer', v)}
          />
          <TextField
            id="mnp-original"
            label="Original Anbieter"
            value={form.originalAnbieter}
            onChange={(v) => handleChange('originalAnbieter', v)}
          />
          <SelectField
            id="mnp-postpaid"
            label="Postpaid? / Prepaid?"
            value={form.postpaidPrepaid}
            options={MNP_POSTPAID_OPTIONS}
            onChange={(v) => handleChange('postpaidPrepaid', v)}
          />
          <SelectField
            id="mnp-details"
            label="MNP-Details"
            value={form.mnpDetails}
            options={MNP_DETAILS_OPTIONS}
            onChange={(v) => handleChange('mnpDetails', v)}
          />
          <TextField
            id="mnp-alt-vorname"
            label="MNP- Alt Kunden Vorname"
            value={form.mnpAltKundenVorname}
            onChange={(v) => handleChange('mnpAltKundenVorname', v)}
          />
          <TextField
            id="mnp-alt-nachname"
            label="MNP- Alt Kunden Nachname"
            value={form.mnpAltKundenNachname}
            onChange={(v) => handleChange('mnpAltKundenNachname', v)}
          />
          <TextField
            id="mnp-alt-geb"
            label="MNP- Alt Kunden Geburtsdatum"
            type="date"
            value={form.mnpAltKundenGeburtsdatum}
            onChange={(v) => handleChange('mnpAltKundenGeburtsdatum', v)}
          />
          <SelectField
            id="mnp-freigegeben"
            label="freigegeben? / nach Vertragsende?"
            value={form.freigegebenNachVertragsende}
            options={MNP_FREIGEGEBEN_OPTIONS}
            onChange={(v) => handleChange('freigegebenNachVertragsende', v)}
          />
          <SelectField
            id="mnp-typ"
            label="MNP Typ"
            value={form.mnpTyp}
            options={MNP_TYP_OPTIONS}
            onChange={(v) => handleChange('mnpTyp', v)}
          />
          <TextField
            id="mnp-bestaetigung"
            label="MNP-Bestätigungsdatum"
            type="date"
            value={form.mnpBestaetigungsdatum}
            onChange={(v) => handleChange('mnpBestaetigungsdatum', v)}
          />
          <div className="form-group vorvertrag-form-grid--full" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="mnp-notiz" className="form-label">Notiz</label>
            <textarea
              id="mnp-notiz"
              className="form-input"
              rows={3}
              value={form.notiz}
              onChange={(ev) => handleChange('notiz', ev.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="vorvertrag-actions">
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Speichern…' : mode === 'edit' ? 'Änderungen speichern' : 'MNP einreichen'}
        </button>
      </div>
    </form>
  );
}
