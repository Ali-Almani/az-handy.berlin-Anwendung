export function customerLabel(entry) {
  const name = [entry?.kundeVorname, entry?.kundeNachname].filter(Boolean).join(' ').trim();
  return name || 'Unbekannter Kunde';
}

export function customerKey(entry) {
  const vorname = String(entry?.kundeVorname ?? '').trim().toLowerCase();
  const nachname = String(entry?.kundeNachname ?? '').trim().toLowerCase();
  const epos = String(entry?.eingabeDetails?.eposKundenummer ?? entry?.eposKundenummer ?? '').trim().toLowerCase();
  if (epos) return `epos:${epos}`;
  return `name:${vorname}|${nachname}`;
}

/** Eindeutige Kunden aus bestehenden Vorverträgen (neueste Daten pro Schlüssel). */
export function buildCustomerCatalog(entries = []) {
  const byKey = new Map();
  for (const entry of entries) {
    const label = customerLabel(entry);
    if (label === 'Unbekannter Kunde') continue;
    const key = customerKey(entry);
    const existing = byKey.get(key);
    const entryTs = Date.parse(entry?.updatedAt || entry?.createdAt || 0) || 0;
    const existingTs = existing ? Date.parse(existing.entry?.updatedAt || existing.entry?.createdAt || 0) || 0 : -1;
    if (!existing || entryTs >= existingTs) {
      byKey.set(key, { key, label, entry });
    }
  }
  return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label, 'de'));
}

export function filterCustomerCatalog(catalog, query) {
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) return catalog;
  return catalog.filter(({ label, entry }) => {
    const e = entry?.eingabeDetails || {};
    const haystack = [
      label,
      entry?.kundeVorname,
      entry?.kundeNachname,
      e.eposKundenummer,
      e.passNummer,
      e.iban
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

/** Kundendaten aus Bestandskunde übernehmen – Vertragsfelder bleiben leer. */
export function customerPatchFromEntry(entry, currentForm = {}) {
  const e = entry?.eingabeDetails || {};
  return {
    kundeVorname: entry?.kundeVorname || '',
    kundeNachname: entry?.kundeNachname || '',
    nationalitaet: e.nationalitaet || '',
    passNummer: e.passNummer || '',
    passAblaufDatum: e.passAblaufDatum || '',
    iban: e.iban || '',
    ibanInhaber: e.ibanInhaber || '',
    eposKundenummer: e.eposKundenummer || '',
    datum: currentForm.datum,
    filiale: currentForm.filiale
  };
}

export function customerPreviewLines(form) {
  return [
    ['Name', [form.kundeVorname, form.kundeNachname].filter(Boolean).join(' ') || '–'],
    ['Nationalität', form.nationalitaet || '–'],
    ['Pass / PA-Nr.', form.passNummer || '–'],
    ['PA Ablauf', form.passAblaufDatum || '–'],
    ['IBAN', form.iban || '–'],
    ['IBAN-Inhaber', form.ibanInhaber || '–'],
    ['ePOS-Kundenummer', form.eposKundenummer || '–']
  ];
}
