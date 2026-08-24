export const MNP_POSTPAID_OPTIONS = ['Postpaid?', 'Prepaid?'];

export const MNP_DETAILS_OPTIONS = [
  'Gleicher Kunde – gleiches O2-Profil',
  'Gleicher Kunde – anderes O2-Profil',
  'Anderer Kunde – O2',
  'Gleicher Kunde – anderer Anbieter',
  'Anderer Kunde – anderer Anbieter'
];

export const MNP_FREIGEGEBEN_OPTIONS = ['freigegeben sofort', 'nach vertragsende'];

export const MNP_TYP_OPTIONS = ['Per Formular', 'Per ePOS'];

export const MNP_STATUS_OPTIONS = [
  'Offen',
  'In Bearbeitung',
  'Wird geprüft',
  'Fehlgeschlagen',
  'Erledigt'
];

/** Vordefinierte Original-Anbieter (Marke + Netz) für MNP */
export const MNP_ORIGINAL_ANBIETER_OPTIONS = [
  { marke: 'ALDI TALK', netz: 'O2 / Telefónica' },
  { marke: 'Blau', netz: 'O2 / Telefónica' },
  { marke: 'FONIC', netz: 'O2 / Telefónica' },
  { marke: 'Tchibo MOBIL', netz: 'O2 / Telefónica' },
  { marke: 'Lebara', netz: 'O2 / Telefónica' },
  { marke: 'AY YILDIZ', netz: 'O2 / Telefónica' },
  { marke: 'Lidl Connect', netz: 'Vodafone' },
  { marke: 'otelo', netz: 'Vodafone' },
  { marke: 'SIMon mobile', netz: 'Vodafone' },
  { marke: 'FYVE', netz: 'Vodafone' },
  { marke: 'congstar', netz: 'Telekom' },
  { marke: 'fraenk', netz: 'Telekom' },
  { marke: 'EDEKA smart', netz: 'Telekom' },
  { marke: 'ja! mobil', netz: 'Telekom' },
  { marke: 'PENNY Mobil', netz: 'Telekom' },
  { marke: 'Kaufland mobil', netz: 'Telekom' },
  { marke: 'NORMA connect', netz: 'Telekom' },
  { marke: '1&1', netz: '1&1' },
  { marke: 'sim.de', netz: '1&1' },
  { marke: 'winSIM', netz: '1&1' },
  { marke: 'PremiumSIM', netz: '1&1' },
  { marke: 'smartmobil.de', netz: '1&1' },
  { marke: 'sim24', netz: '1&1' },
  { marke: 'handyvertrag.de', netz: '1&1' },
  { marke: 'yourfone', netz: '1&1' },
  { marke: 'maXXim', netz: '1&1' },
  { marke: 'BLACKSIM', netz: '1&1' },
  { marke: 'BILDconnect', netz: '1&1' }
];

export const MNP_ORIGINAL_ANBIETER_MARKEN = MNP_ORIGINAL_ANBIETER_OPTIONS.map((o) => o.marke);

export function filterOriginalAnbieterOptions(query = '') {
  const q = String(query).trim().toLowerCase();
  if (!q) return MNP_ORIGINAL_ANBIETER_OPTIONS;
  return MNP_ORIGINAL_ANBIETER_OPTIONS.filter(
    ({ marke, netz }) => marke.toLowerCase().includes(q) || netz.toLowerCase().includes(q)
  );
}

export function isKnownOriginalAnbieter(marke = '') {
  const m = String(marke).trim();
  return MNP_ORIGINAL_ANBIETER_MARKEN.some((known) => known.toLowerCase() === m.toLowerCase());
}

export const emptyMnpDetails = () => ({
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

export function mnpDetailsFromEingabe(eingabeDetails = {}) {
  const raw = eingabeDetails?.mnpDetails;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...emptyMnpDetails(), ...raw };
  }
  const legacy = String(eingabeDetails?.mnp ?? '').trim();
  if (legacy) {
    return { ...emptyMnpDetails(), notiz: legacy };
  }
  return emptyMnpDetails();
}

export function hasMnpDetailsContent(details = {}) {
  const skip = new Set(['status']);
  return Object.entries(details).some(([key, value]) => {
    if (skip.has(key)) return String(value ?? '').trim() && value !== 'Offen';
    return String(value ?? '').trim() !== '';
  });
}

/** Pflicht-Auswahlfelder für MNP (Schritt 5) vor dem Speichern */
export function validateMnpDetailsForSubmit(details = {}) {
  const mnp = details || {};
  if (!String(mnp.postpaidPrepaid ?? '').trim()) {
    return 'Bitte Postpaid/Prepaid wählen.';
  }
  if (!String(mnp.mnpDetails ?? '').trim()) {
    return 'Bitte MNP-Details wählen.';
  }
  if (!String(mnp.freigegebenNachVertragsende ?? '').trim()) {
    return 'Bitte freigegeben/nach Vertragsende wählen.';
  }
  if (!String(mnp.mnpTyp ?? '').trim()) {
    return 'Bitte MNP Typ wählen.';
  }
  return '';
}

export const MNP_FIELD_LABELS = {
  mitarbeiter: 'Mitarbeiter',
  neuesVertragsdatum: 'Vertragsdatum',
  neueO2Rufnummer: 'Neue O2 Rufnummer',
  eposKn: 'ePOS KN',
  iban: 'IBAN',
  letzten7SimKarte: 'letzten 7 von SIM karte',
  kundenVorname: 'Kunden Vorname',
  kundenNachname: 'Kunden Nachname',
  kundenGeburtsdatum: 'Kunden Geburtsdatum',
  kundenAktuellKontaktNummer: 'Kunden Aktuell Kontakt nummer',
  kundenVollstaendigeAdresse: 'Kunden Vollständige Adresse (ePOS)',
  mnpRufnummer: 'MNP Rufnummer',
  originalAnbieter: 'Original Anbieter',
  postpaidPrepaid: 'Postpaid? / Prepaid?',
  mnpDetails: 'MNP-Details',
  mnpAltKundenVorname: 'MNP- Alt Kunden Vorname',
  mnpAltKundenNachname: 'MNP- Alt Kunden Nachname',
  mnpAltKundenGeburtsdatum: 'MNP- Alt Kunden Geburtsdatum',
  freigegebenNachVertragsende: 'freigegeben? / nach Vertragsende?',
  mnpTyp: 'MNP Typ',
  status: 'Status',
  mnpBestaetigungsdatum: 'MNP-Bestätigungsdatum',
  notiz: 'Notiz'
};
