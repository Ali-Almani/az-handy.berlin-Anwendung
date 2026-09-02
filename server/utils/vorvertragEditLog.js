const ACTION_LABELS = {
  created: 'Erstellt',
  updated: 'Bearbeitet',
  status_changed: 'Status geändert'
};

const FIELD_LABELS = {
  datum: 'Datum',
  filiale: 'Filiale',
  entryType: 'Typ',
  kundeVorname: 'Vorname',
  kundeNachname: 'Nachname',
  ticketStatus: 'Status',
  priority: 'Priorität',
  'ausgabeDetails.geraet': 'Gerät',
  'ausgabeDetails.farbe': 'Farbe',
  'ausgabeDetails.verfuegbarkeit': 'Verfügbarkeit',
  'anschluss.jaNein': 'Anschluss',
  'anschluss.wert': 'Anschluss-Wert',
  'zuzahlung.jaNein': 'Zuzahlung',
  'zuzahlung.wert': 'Zuzahlung-Wert',
  'eingabeDetails.nationalitaet': 'Nationalität',
  'eingabeDetails.passNummer': 'Pass / PA-Nr.',
  'eingabeDetails.passAblaufDatum': 'PA Ablauf',
  'eingabeDetails.iban': 'IBAN',
  'eingabeDetails.ibanInhaber': 'IBAN-Inhaber',
  'eingabeDetails.imeisMonate': 'IMEIs – 24/36 Monaten',
  'eingabeDetails.hwVoucher': 'HW-Voucher',
  'eingabeDetails.kombi': 'Kombi',
  'eingabeDetails.vvl': 'VVL',
  'eingabeDetails.eposKundenummer': 'ePOS-Kundenummer',
  'eingabeDetails.notiz': 'Notiz',
  'eingabeDetails.mnpDetails.mitarbeiter': 'MNP Mitarbeiter',
  'eingabeDetails.mnpDetails.neuesVertragsdatum': 'MNP Vertragsdatum',
  'eingabeDetails.mnpDetails.status': 'MNP Status',
  'eingabeDetails.mnpDetails.neueO2Rufnummer': 'Neue O2 Rufnummer',
  'eingabeDetails.mnpDetails.eposKn': 'ePOS KN',
  'eingabeDetails.mnpDetails.iban': 'MNP IBAN',
  'eingabeDetails.mnpDetails.letzten7SimKarte': 'SIM (letzten 7)',
  'eingabeDetails.mnpDetails.kundenVorname': 'MNP Vorname',
  'eingabeDetails.mnpDetails.kundenNachname': 'MNP Nachname',
  'eingabeDetails.mnpDetails.kundenGeburtsdatum': 'MNP Geburtsdatum',
  'eingabeDetails.mnpDetails.kundenAktuellKontaktNummer': 'MNP Kontakt',
  'eingabeDetails.mnpDetails.kundenVollstaendigeAdresse': 'MNP Adresse',
  'eingabeDetails.mnpDetails.mnpRufnummer': 'MNP Rufnummer',
  'eingabeDetails.mnpDetails.originalAnbieter': 'Original Anbieter',
  'eingabeDetails.mnpDetails.postpaidPrepaid': 'Postpaid/Prepaid',
  'eingabeDetails.mnpDetails.mnpDetails': 'MNP-Details',
  'eingabeDetails.mnpDetails.mnpAltKundenVorname': 'MNP Alt-Vorname',
  'eingabeDetails.mnpDetails.mnpAltKundenNachname': 'MNP Alt-Nachname',
  'eingabeDetails.mnpDetails.mnpAltKundenGeburtsdatum': 'MNP Alt-Geburtsdatum',
  'eingabeDetails.mnpDetails.freigegebenNachVertragsende': 'Freigegeben/Vertragsende',
  'eingabeDetails.mnpDetails.mnpTyp': 'MNP Typ',
  'eingabeDetails.mnpDetails.mnpBestaetigungsdatum': 'MNP-Bestätigungsdatum',
  'eingabeDetails.mnpDetails.notiz': 'MNP Notiz'
};

function flatten(value, prefix = '', out = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, nested] of Object.entries(value)) {
      flatten(nested, prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }
  if (prefix) out[prefix] = value;
  return out;
}

function formatValue(value) {
  if (value == null) return '—';
  const text = String(value).trim();
  return text === '' ? '—' : text;
}

function fieldLabel(path) {
  return FIELD_LABELS[path] || path.split('.').pop();
}

function diffSnapshots(prevSnap, nextSnap) {
  const prev = flatten(prevSnap || {});
  const next = flatten(nextSnap || {});
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const changes = [];
  for (const key of keys) {
    const from = formatValue(prev[key]);
    const to = formatValue(next[key]);
    if (from === to) continue;
    changes.push({ field: fieldLabel(key), from, to });
  }
  return changes;
}

function actionLabel(action, changes) {
  if (action === 'created') return ACTION_LABELS.created;
  if (action === 'status_changed') {
    const statusChange = changes.find((c) => c.field === 'Status');
    if (statusChange) return `Status: ${statusChange.from} → ${statusChange.to}`;
    return ACTION_LABELS.status_changed;
  }
  return ACTION_LABELS.updated;
}

/** Neueste Einträge zuerst, ohne Snapshots. */
export function buildVorvertragEditLog(editHistory = []) {
  const raw = Array.isArray(editHistory) ? [...editHistory] : [];
  const chronological = [...raw].sort((a, b) => {
    const ta = Date.parse(a?.timestamp || 0) || 0;
    const tb = Date.parse(b?.timestamp || 0) || 0;
    return ta - tb;
  });

  const items = chronological.map((item, index) => {
    const prevSnap = index > 0 ? chronological[index - 1]?.snapshot : null;
    const changes = item?.action === 'created'
      ? []
      : diffSnapshots(prevSnap, item?.snapshot);
    return {
      id: item?.id || `hist-${index}`,
      timestamp: item?.timestamp || '',
      action: item?.action || 'updated',
      actionLabel: actionLabel(item?.action, changes),
      editorUserId: item?.editorUserId || '',
      editorUserName: item?.editorUserName || '',
      editorEmail: item?.editorEmail || '',
      changes
    };
  });

  return items.reverse();
}
