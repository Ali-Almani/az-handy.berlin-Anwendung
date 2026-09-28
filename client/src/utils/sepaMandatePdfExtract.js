/** O2/Telefónica SEPA-Lastschriftmandat: nur Kontoinhaber + Datum (Unterschrifts-Datum). */

export function isSepaLastschriftMandatePage(text) {
  const t = String(text || '').replace(/\s+/g, ' ');
  if (!/Kontoinhaber/i.test(t)) return false;
  return (
    /SEPA\s*Lastschriftmandat/i.test(t) ||
    (/Lastschriftmandat/i.test(t) && /Gläubiger-Identifikationsnummer|Telef[oó]nica|O2/i.test(t))
  );
}

function splitMandateSection(text) {
  const raw = String(text || '');
  const idx = raw.search(/Falls\s+Vertragsinhaber/i);
  return idx >= 0 ? raw.slice(0, idx) : raw;
}

export function extractKontoinhaberFromSepaText(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/^Kontoinhaber/i.test(line)) continue;

    const inline = line.replace(/^Kontoinhaber\s*\*?\s*/i, '').trim();
    if (inline && !/^(Straße|Strasse|Str\.|Postleitzahl|PLZ|IBAN)/i.test(inline) && !/^\d/.test(inline)) {
      return inline.replace(/\*+$/, '').trim();
    }

    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const next = lines[j];
      if (/^(Straße|Strasse|Str\.|Postleitzahl|PLZ|IBAN|Kreditinstitut)/i.test(next)) break;
      if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(next)) break;
      if (/^[A-Z]{2}\d/.test(next.replace(/\s/g, ''))) break;
      if (next.length >= 2 && !/^\d+$/.test(next)) return next.replace(/\*+$/, '').trim();
    }
  }

  const compact = String(text || '').replace(/\s+/g, ' ');
  const m = compact.match(
    /Kontoinhaber\s*\*?\s*([\p{L}][\p{L}\s.'-]{1,78}?)\s+(?:Straße|Strasse|Str\.)/iu
  );
  return m ? m[1].replace(/\*+$/, '').trim() : '';
}

export function extractSepaDatumFromSepaText(text) {
  const section = splitMandateSection(text);
  const lines = section
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    if (!/^Datum\b/i.test(lines[i])) continue;
    const inline = lines[i].replace(/^Datum\s*/i, '').trim();
    const inlineDate = inline.match(/(\d{1,2}\.\d{1,2}\.\d{4})/);
    if (inlineDate) return inlineDate[1];

    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const next = lines[j];
      if (/Geburtsdatum/i.test(next)) continue;
      const dm = next.match(/(\d{1,2}\.\d{1,2}\.\d{4})/);
      if (dm) return dm[1];
      if (/Unterschrift|IBAN|Kreditinstitut/i.test(next)) break;
    }
  }

  const compact = section.replace(/\s+/g, ' ');
  const labeled = compact.match(/\bDatum\b[^0-9]{0,30}(\d{1,2}\.\d{1,2}\.\d{4})/i);
  if (labeled) return labeled[1];

  const dates = [...compact.matchAll(/(\d{1,2}\.\d{1,2}\.\d{4})/g)];
  for (const m of dates) {
    const before = compact.slice(Math.max(0, m.index - 24), m.index);
    if (/Geburtsdatum/i.test(before)) continue;
    return m[1];
  }
  return '';
}

export function extractSepaMandateFieldsFromPageText(text) {
  if (!isSepaLastschriftMandatePage(text)) return null;
  const kontoinhaber = extractKontoinhaberFromSepaText(text);
  const datum = extractSepaDatumFromSepaText(text);
  if (!kontoinhaber || !datum) return null;
  return { kontoinhaber, datum };
}

export function buildSepaPdfFileName({ kontoinhaber, datum }, originalName = 'dokument.pdf') {
  const name = String(kontoinhaber || '')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ');
  const date = String(datum || '').trim();
  const base = [name, date].filter(Boolean).join(' ').trim() || 'SEPA-Mandat';
  const ext = String(originalName || '').toLowerCase().endsWith('.pdf') ? '.pdf' : '.pdf';
  return `${base}${ext}`;
}
