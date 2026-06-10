import { useState } from 'react';
import { formatVerfuegbarkeit, parseAusgabeDetails, normalizeMitOhne } from './vorvertragGeraeteUtils';
import { formatEinsatzOrt } from '../../constants/einsatzorte';

function Field({ label, value, badge }) {
  if (value == null || String(value).trim() === '') return null;
  const text = String(value).trim();
  return (
    <div className="vorvertrag-entry-card__field">
      <span className="vorvertrag-entry-card__label">{label}</span>
      {badge ? (
        <span className={`vorvertrag-entry-card__badge vorvertrag-entry-card__badge--${badge}`}>
          {text}
        </span>
      ) : (
        <span className="vorvertrag-entry-card__value">{text}</span>
      )}
    </div>
  );
}

function AccordionSection({ id, title, open, onToggle, children }) {
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  if (items.length === 0) return null;

  return (
    <section className={`vorvertrag-entry-card__accordion${open ? ' vorvertrag-entry-card__accordion--open' : ''}`}>
      <button
        type="button"
        className="vorvertrag-entry-card__accordion-trigger"
        onClick={() => onToggle(id)}
        aria-expanded={open}
      >
        <span className="vorvertrag-entry-card__accordion-title">{title}</span>
        <span className="vorvertrag-entry-card__accordion-icon" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>
      {open ? (
        <div className="vorvertrag-entry-card__accordion-panel">
          {items}
        </div>
      ) : null}
    </section>
  );
}

function MetaChip({ children, accent }) {
  return (
    <span className={`vorvertrag-entry-card__chip${accent ? ' vorvertrag-entry-card__chip--accent' : ''}`}>
      {children}
    </span>
  );
}

function jaNeinLabel(jaNein, wert) {
  if (jaNein === 'ja') return wert ? `Ja (${wert})` : 'Ja';
  return 'Nein';
}

function jaNeinBadge(jaNein) {
  return jaNein === 'ja' ? 'yes' : 'no';
}

function mitOhneBadge(value) {
  return normalizeMitOhne(value) === 'Mit' ? 'yes' : 'no';
}

function verfuegbarkeitBadge(value) {
  if (value === 'in_shop') return 'shop';
  if (value === 'bestellen') return 'order';
  return null;
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

function formatDatum(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '—';
  const parts = raw.split('-');
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return raw;
}

export default function VorvertragEntryCard({ entry, onEdit, onDelete, deleting = false, highlighted = false }) {
  const e = entry?.eingabeDetails || {};
  const ausgabe = parseAusgabeDetails(entry?.ausgabeDetails);
  const name = [entry?.kundeVorname, entry?.kundeNachname].filter(Boolean).join(' ') || 'Ohne Kundenname';
  const mitarbeiter = mitarbeiterName(entry);
  const hasDevice = Boolean(ausgabe.geraet);
  const [openSection, setOpenSection] = useState(hasDevice ? 'device' : 'vertrag');

  const toggleSection = (id) => {
    setOpenSection((prev) => (prev === id ? null : id));
  };

  return (
    <article
      className={`vorvertrag-entry-card${highlighted ? ' vorvertrag-entry-card--highlight' : ''}`}
      data-entry-id={entry?.id}
    >
      <header className="vorvertrag-entry-card__header">
        <div className="vorvertrag-entry-card__head">
          <h3 className="vorvertrag-entry-card__title">{name}</h3>
          <div className="vorvertrag-entry-card__meta">
            <MetaChip>{formatDatum(entry?.datum)}</MetaChip>
            <MetaChip accent>{formatEinsatzOrt(entry?.filiale)}</MetaChip>
            {mitarbeiter ? <MetaChip>{mitarbeiter}</MetaChip> : null}
          </div>
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
            {deleting ? 'Löschen…' : 'Löschen'}
          </button>
        </div>
      </header>

      <div className="vorvertrag-entry-card__body">
        {hasDevice ? (
          <AccordionSection
            id="device"
            title="Gerät & Ausgabe"
            open={openSection === 'device'}
            onToggle={toggleSection}
          >
            <div className="vorvertrag-entry-card__device">
              <span className="vorvertrag-entry-card__device-name">{ausgabe.geraet}</span>
              {ausgabe.farbe ? (
                <span className="vorvertrag-entry-card__device-detail">{ausgabe.farbe}</span>
              ) : null}
              {ausgabe.verfuegbarkeit ? (
                <span
                  className={`vorvertrag-entry-card__badge vorvertrag-entry-card__badge--${verfuegbarkeitBadge(ausgabe.verfuegbarkeit) || 'neutral'}`}
                >
                  {formatVerfuegbarkeit(ausgabe.verfuegbarkeit)}
                </span>
              ) : null}
            </div>
          </AccordionSection>
        ) : null}

        <AccordionSection
          id="vertrag"
          title="Vertrag"
          open={openSection === 'vertrag'}
          onToggle={toggleSection}
        >
          <div className="vorvertrag-entry-card__fields">
            <Field
              label="Anschluss"
              value={jaNeinLabel(entry?.anschluss?.jaNein, entry?.anschluss?.wert)}
              badge={jaNeinBadge(entry?.anschluss?.jaNein)}
            />
            <Field
              label="Zuzahlung"
              value={jaNeinLabel(entry?.zuzahlung?.jaNein, entry?.zuzahlung?.wert)}
              badge={jaNeinBadge(entry?.zuzahlung?.jaNein)}
            />
            <Field label="IMEIs – 24/36 Monaten" value={e.imeisMonate} />
            <Field label="HW-Voucher" value={e.hwVoucher} />
            <Field label="Kombi" value={normalizeMitOhne(e.kombi)} badge={mitOhneBadge(e.kombi)} />
            <Field label="VVL" value={normalizeMitOhne(e.vvl)} badge={mitOhneBadge(e.vvl)} />
          </div>
        </AccordionSection>

        <AccordionSection
          id="kunde"
          title="Kunde & Zahlung"
          open={openSection === 'kunde'}
          onToggle={toggleSection}
        >
          <div className="vorvertrag-entry-card__fields">
            <Field label="Nationalität" value={e.nationalitaet} />
            <Field label="Pass / PA-Nr." value={e.passNummer} />
            <Field label="PA Ablauf" value={e.passAblaufDatum} />
            <Field label="IBAN" value={e.iban} />
            <Field label="IBAN-Inhaber" value={e.ibanInhaber} />
          </div>
        </AccordionSection>

        <AccordionSection
          id="sonstiges"
          title="Sonstiges"
          open={openSection === 'sonstiges'}
          onToggle={toggleSection}
        >
          <div className="vorvertrag-entry-card__fields">
            <Field label="ePOS-Kundenummer" value={e.eposKundenummer} />
            <Field label="MNP" value={e.mnp} />
            <Field label="Notiz" value={e.notiz} />
          </div>
        </AccordionSection>
      </div>
    </article>
  );
}
