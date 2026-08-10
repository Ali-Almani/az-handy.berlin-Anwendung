import { useState } from 'react';
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

function formatDatum(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '—';
  const parts = raw.split('-');
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return raw;
}

function statusBadge(status) {
  const s = String(status ?? '').trim().toLowerCase();
  if (s === 'erledigt') return 'yes';
  if (s === 'fehlgeschlagen') return 'no';
  if (s === 'in bearbeitung' || s === 'wird geprüft') return 'order';
  return 'neutral';
}

export default function MnpEntryCard({ entry, onEdit, highlighted = false }) {
  const name = [entry?.kundenVorname, entry?.kundenNachname].filter(Boolean).join(' ') || 'Ohne Kundenname';
  const mitarbeiter = entry?.mitarbeiterName || entry?.mitarbeiter || '';
  const [openSection, setOpenSection] = useState('mnp');

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
            <MetaChip>{formatDatum(entry?.neuesVertragsdatum)}</MetaChip>
            <MetaChip accent>{formatEinsatzOrt(entry?.filiale)}</MetaChip>
            {entry?.status ? (
              <span className={`vorvertrag-entry-card__badge vorvertrag-entry-card__badge--${statusBadge(entry.status)}`}>
                {entry.status}
              </span>
            ) : null}
            {mitarbeiter ? <MetaChip>{mitarbeiter}</MetaChip> : null}
          </div>
        </div>
        <div className="vorvertrag-entry-card__actions">
          <button type="button" className="btn btn--secondary btn--small" onClick={() => onEdit?.(entry)}>
            Bearbeiten
          </button>
        </div>
      </header>

      <div className="vorvertrag-entry-card__body">
        <AccordionSection
          id="vertrag"
          title="Vertrag & Kontakt"
          open={openSection === 'vertrag'}
          onToggle={toggleSection}
        >
          <div className="vorvertrag-entry-card__fields">
            <Field label="Neue O2 Rufnummer" value={entry?.neueO2Rufnummer} />
            <Field label="ePOS KN" value={entry?.eposKn} />
            <Field label="IBAN" value={entry?.iban} />
            <Field label="letzten 7 von SIM karte" value={entry?.letzten7SimKarte} />
          </div>
        </AccordionSection>

        <AccordionSection
          id="kunde"
          title="Kunde"
          open={openSection === 'kunde'}
          onToggle={toggleSection}
        >
          <div className="vorvertrag-entry-card__fields">
            <Field label="Kunden Geburtsdatum" value={formatDatum(entry?.kundenGeburtsdatum)} />
            <Field label="Kontakt nummer" value={entry?.kundenAktuellKontaktNummer} />
            <Field label="Adresse (ePOS)" value={entry?.kundenVollstaendigeAdresse} />
          </div>
        </AccordionSection>

        <AccordionSection
          id="mnp"
          title="MNP-Details"
          open={openSection === 'mnp'}
          onToggle={toggleSection}
        >
          <div className="vorvertrag-entry-card__fields">
            <Field label="MNP Rufnummer" value={entry?.mnpRufnummer} />
            <Field label="Original Anbieter" value={entry?.originalAnbieter} />
            <Field label="Postpaid? / Prepaid?" value={entry?.postpaidPrepaid} />
            <Field label="MNP-Details" value={entry?.mnpDetails} />
            <Field label="Alt Kunde Vorname" value={entry?.mnpAltKundenVorname} />
            <Field label="Alt Kunde Nachname" value={entry?.mnpAltKundenNachname} />
            <Field label="Alt Kunde Geburtsdatum" value={formatDatum(entry?.mnpAltKundenGeburtsdatum)} />
            <Field label="freigegeben? / nach Vertragsende?" value={entry?.freigegebenNachVertragsende} />
            <Field label="MNP Typ" value={entry?.mnpTyp} />
            <Field label="MNP-Bestätigungsdatum" value={formatDatum(entry?.mnpBestaetigungsdatum)} />
            <Field label="Notiz" value={entry?.notiz} />
          </div>
        </AccordionSection>
      </div>
    </article>
  );
}
