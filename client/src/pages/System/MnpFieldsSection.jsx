import {
  MNP_DETAILS_OPTIONS,
  MNP_FREIGEGEBEN_OPTIONS,
  MNP_POSTPAID_OPTIONS,
  MNP_STATUS_OPTIONS,
  MNP_TYP_OPTIONS
} from './mnpConstants';

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

export default function MnpFieldsSection({
  details,
  onChange,
  idPrefix = 'vv-mnp',
  showTitle = true
}) {
  const d = details || {};
  const handleChange = (field, value) => onChange(field, value);

  return (
    <>
      {showTitle ? (
        <div className="vorvertrag-section">
          <h3 className="vorvertrag-section-title">MNP</h3>
        </div>
      ) : null}

      <div className="vorvertrag-section">
        <h3 className="vorvertrag-section-title">Allgemein</h3>
        <div className="vorvertrag-form-grid">
          <TextField
            id={`${idPrefix}-mitarbeiter`}
            label="Mitarbeiter"
            value={d.mitarbeiter || ''}
            onChange={(v) => handleChange('mitarbeiter', v)}
          />
          <TextField
            id={`${idPrefix}-neues-vertragsdatum`}
            label="Neues Vertragsdatum"
            type="date"
            value={d.neuesVertragsdatum || ''}
            onChange={(v) => handleChange('neuesVertragsdatum', v)}
          />
          <SelectField
            id={`${idPrefix}-status`}
            label="Status"
            value={d.status || 'Offen'}
            options={MNP_STATUS_OPTIONS}
            onChange={(v) => handleChange('status', v)}
          />
        </div>
      </div>

      <div className="vorvertrag-section">
        <h3 className="vorvertrag-section-title">Vertrag &amp; Kontakt</h3>
        <div className="vorvertrag-form-grid">
          <TextField
            id={`${idPrefix}-neue-o2`}
            label="Neue O2 Rufnummer"
            value={d.neueO2Rufnummer || ''}
            onChange={(v) => handleChange('neueO2Rufnummer', v)}
          />
          <TextField
            id={`${idPrefix}-epos-kn`}
            label="ePOS KN"
            value={d.eposKn || ''}
            onChange={(v) => handleChange('eposKn', v)}
          />
          <TextField
            id={`${idPrefix}-iban`}
            label="IBAN"
            value={d.iban || ''}
            onChange={(v) => handleChange('iban', v)}
          />
          <TextField
            id={`${idPrefix}-sim7`}
            label="letzten 7 von SIM karte"
            value={d.letzten7SimKarte || ''}
            onChange={(v) => handleChange('letzten7SimKarte', v)}
          />
        </div>
      </div>

      <div className="vorvertrag-section">
        <h3 className="vorvertrag-section-title">Kunde (MNP)</h3>
        <div className="vorvertrag-form-grid">
          <TextField
            id={`${idPrefix}-k-vorname`}
            label="Kunden Vorname"
            value={d.kundenVorname || ''}
            onChange={(v) => handleChange('kundenVorname', v)}
          />
          <TextField
            id={`${idPrefix}-k-nachname`}
            label="Kunden Nachname"
            value={d.kundenNachname || ''}
            onChange={(v) => handleChange('kundenNachname', v)}
          />
          <TextField
            id={`${idPrefix}-k-geb`}
            label="Kunden Geburtsdatum"
            type="date"
            value={d.kundenGeburtsdatum || ''}
            onChange={(v) => handleChange('kundenGeburtsdatum', v)}
          />
          <TextField
            id={`${idPrefix}-k-kontakt`}
            label="Kunden Aktuell Kontakt nummer"
            value={d.kundenAktuellKontaktNummer || ''}
            onChange={(v) => handleChange('kundenAktuellKontaktNummer', v)}
          />
          <div className="form-group vorvertrag-form-grid--full" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor={`${idPrefix}-k-adresse`} className="form-label">Kunden Vollständige Adresse (ePOS)</label>
            <textarea
              id={`${idPrefix}-k-adresse`}
              className="form-input"
              rows={2}
              value={d.kundenVollstaendigeAdresse || ''}
              onChange={(ev) => handleChange('kundenVollstaendigeAdresse', ev.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="vorvertrag-section">
        <h3 className="vorvertrag-section-title">MNP-Details</h3>
        <div className="vorvertrag-form-grid">
          <TextField
            id={`${idPrefix}-rufnummer`}
            label="MNP Rufnummer"
            value={d.mnpRufnummer || ''}
            onChange={(v) => handleChange('mnpRufnummer', v)}
          />
          <TextField
            id={`${idPrefix}-original`}
            label="Original Anbieter"
            value={d.originalAnbieter || ''}
            onChange={(v) => handleChange('originalAnbieter', v)}
          />
          <SelectField
            id={`${idPrefix}-postpaid`}
            label="Postpaid? / Prepaid?"
            value={d.postpaidPrepaid || ''}
            options={MNP_POSTPAID_OPTIONS}
            onChange={(v) => handleChange('postpaidPrepaid', v)}
            required
          />
          <SelectField
            id={`${idPrefix}-details`}
            label="MNP-Details"
            value={d.mnpDetails || ''}
            options={MNP_DETAILS_OPTIONS}
            onChange={(v) => handleChange('mnpDetails', v)}
            required
          />
          <TextField
            id={`${idPrefix}-alt-vorname`}
            label="MNP- Alt Kunden Vorname"
            value={d.mnpAltKundenVorname || ''}
            onChange={(v) => handleChange('mnpAltKundenVorname', v)}
          />
          <TextField
            id={`${idPrefix}-alt-nachname`}
            label="MNP- Alt Kunden Nachname"
            value={d.mnpAltKundenNachname || ''}
            onChange={(v) => handleChange('mnpAltKundenNachname', v)}
          />
          <TextField
            id={`${idPrefix}-alt-geb`}
            label="MNP- Alt Kunden Geburtsdatum"
            type="date"
            value={d.mnpAltKundenGeburtsdatum || ''}
            onChange={(v) => handleChange('mnpAltKundenGeburtsdatum', v)}
          />
          <SelectField
            id={`${idPrefix}-freigegeben`}
            label="freigegeben? / nach Vertragsende?"
            value={d.freigegebenNachVertragsende || ''}
            options={MNP_FREIGEGEBEN_OPTIONS}
            onChange={(v) => handleChange('freigegebenNachVertragsende', v)}
            required
          />
          <SelectField
            id={`${idPrefix}-typ`}
            label="MNP Typ"
            value={d.mnpTyp || ''}
            options={MNP_TYP_OPTIONS}
            onChange={(v) => handleChange('mnpTyp', v)}
            required
          />
          <TextField
            id={`${idPrefix}-bestaetigung`}
            label="MNP-Bestätigungsdatum"
            type="date"
            value={d.mnpBestaetigungsdatum || ''}
            onChange={(v) => handleChange('mnpBestaetigungsdatum', v)}
          />
          <div className="form-group vorvertrag-form-grid--full" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor={`${idPrefix}-notiz`} className="form-label">MNP Notiz</label>
            <textarea
              id={`${idPrefix}-notiz`}
              className="form-input"
              rows={3}
              value={d.notiz || ''}
              onChange={(ev) => handleChange('notiz', ev.target.value)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
