import { formatVerfuegbarkeit, parseAusgabeDetails, normalizeMitOhne } from './vorvertragGeraeteUtils';

function Field({ label, value }) {
  if (value == null || String(value).trim() === '') return null;
  return (
    <div className="vorvertrag-entry-card__field">
      <span className="vorvertrag-entry-card__label">{label}</span>
      <span className="vorvertrag-entry-card__value">{value}</span>
    </div>
  );
}

function jaNeinLabel(jaNein, wert) {
  if (jaNein === 'ja') return wert ? `Ja (${wert})` : 'Ja';
  return 'Nein';
}

function mitarbeiterName(entry) {
  const candidate =
    entry?.mitarbeiterName ||
    entry?.createdBy?.name ||
    entry?.createdBy?.userName ||
    entry?.lastEditedBy?.name ||
    entry?.lastEditedBy?.userName ||
    '';
  const value = String(candidate).trim();
  if (!value) return '';
  const roleLike = [
    'admin',
    'Administrator',
    'Büro Mitarbeiter',
    'Marketing',
    'Callcenter',
    'Shops',
    'Buchhaltung',
    'Einkauf',
    'Partner',
    'Teamleiter shop',
    'Mitarbeiter shop',
    'Mitarbeiter'
  ];
  if (roleLike.includes(value) || /^mitarbeiter(\s|$)/i.test(value)) return '';
  return value;
}

export default function VorvertragEntryCard({ entry, onEdit, onDelete, deleting = false, highlighted = false }) {
  const e = entry?.eingabeDetails || {};
  const ausgabe = parseAusgabeDetails(entry?.ausgabeDetails);
  const name = [entry?.kundeVorname, entry?.kundeNachname].filter(Boolean).join(' ') || 'Ohne Kundenname';

  return (
    <article
      className={`vorvertrag-entry-card${highlighted ? ' vorvertrag-entry-card--highlight' : ''}`}
      data-entry-id={entry?.id}
    >
      <header className="vorvertrag-entry-card__header">
        <div className="vorvertrag-entry-card__head">
          <h3 className="vorvertrag-entry-card__title">{name}</h3>
          <p className="vorvertrag-entry-card__meta">
            {entry?.datum || '—'} · {entry?.filiale || '—'} · {mitarbeiterName(entry) || '—'}
          </p>
        </div>
        <div className="vorvertrag-entry-card__actions">
          <button type="button" className="btn btn--secondary btn--small" onClick={() => onEdit?.(entry)}>
            Bearbeiten
          </button>
          <button
            type="button"
            className="btn btn--danger btn--small"
            onClick={() => onDelete?.(entry)}
            disabled={deleting}
          >
            Löschen
          </button>
        </div>
      </header>

      <div className="vorvertrag-entry-card__body">
        <Field label="Gerät" value={ausgabe.geraet} />
        <Field label="Farbe" value={ausgabe.farbe} />
        <Field label="Verfügbarkeit" value={formatVerfuegbarkeit(ausgabe.verfuegbarkeit)} />
        <Field label="Anschluss" value={jaNeinLabel(entry?.anschluss?.jaNein, entry?.anschluss?.wert)} />
        <Field label="Zuzahlung" value={jaNeinLabel(entry?.zuzahlung?.jaNein, entry?.zuzahlung?.wert)} />
        <Field label="Nationalität" value={e.nationalitaet} />
        <Field label="Pass / PA-Nr." value={e.passNummer} />
        <Field label="PA Ablauf" value={e.passAblaufDatum} />
        <Field label="IBAN" value={e.iban} />
        <Field label="IBAN-Inhaber" value={e.ibanInhaber} />
        <Field label="IMEIs – 24/36 Monaten" value={e.imeisMonate} />
        <Field label="HW-Voucher" value={e.hwVoucher} />
        <Field label="Kombi" value={normalizeMitOhne(e.kombi)} />
        <Field label="VVL" value={normalizeMitOhne(e.vvl)} />
        <Field label="ePOS-Kundenummer" value={e.eposKundenummer} />
        <Field label="MNP" value={e.mnp} />
        <Field label="Notiz" value={e.notiz} />
      </div>
    </article>
  );
}
