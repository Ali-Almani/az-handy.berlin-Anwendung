import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import {
  buildSepaPdfFileName,
  extractKontoinhaberFromSepaText,
  extractSepaDatumFromSepaText,
  extractSepaMandateFieldsFromPageText,
  isSepaLastschriftMandatePage
} from './sepaMandatePdfExtract';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

function groupTextItemsIntoLines(items) {
  const sorted = [...items].sort((a, b) => {
    const yA = a.transform?.[5] ?? 0;
    const yB = b.transform?.[5] ?? 0;
    if (Math.abs(yB - yA) > 3) return yB - yA;
    const xA = a.transform?.[4] ?? 0;
    const xB = b.transform?.[4] ?? 0;
    return xA - xB;
  });

  const lines = [];
  let currentY = null;
  let currentParts = [];

  for (const item of sorted) {
    const str = String(item.str ?? '').trim();
    if (!str) continue;
    const y = item.transform?.[5] ?? 0;
    if (currentY == null || Math.abs(y - currentY) <= 3) {
      currentY = currentY == null ? y : (currentY + y) / 2;
      currentParts.push(str);
    } else {
      if (currentParts.length) lines.push(currentParts.join(' ').trim());
      currentY = y;
      currentParts = [str];
    }
  }
  if (currentParts.length) lines.push(currentParts.join(' ').trim());
  return lines.join('\n');
}

async function getPageText(page) {
  const content = await page.getTextContent();
  return groupTextItemsIntoLines(content.items || []);
}

/**
 * Alle Seiten durchgehen, bis eine SEPA-Lastschriftmandat-Seite (O2 o. ä.) gefunden ist.
 */
export async function extractSepaRenameInfoFromPdf(arrayBuffer) {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, useSystemFonts: true });
  const pdf = await loadingTask.promise;
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const text = await getPageText(page);
    if (!isSepaLastschriftMandatePage(text)) continue;

    const fields = extractSepaMandateFieldsFromPageText(text);
    if (fields) {
      return { ...fields, pageNum, pageCount: pdf.numPages };
    }

    const kontoinhaber = extractKontoinhaberFromSepaText(text);
    const datum = extractSepaDatumFromSepaText(text);
    if (kontoinhaber && datum) {
      return { kontoinhaber, datum, pageNum, pageCount: pdf.numPages };
    }
  }

  throw new Error(
    'Keine SEPA-Lastschriftmandat-Seite mit Kontoinhaber und Datum gefunden. (Gescannte PDFs ohne Textschicht werden nicht erkannt.)'
  );
}

export async function suggestSepaPdfFileName(file) {
  const buffer = await file.arrayBuffer();
  const info = await extractSepaRenameInfoFromPdf(buffer);
  return {
    ...info,
    suggestedName: buildSepaPdfFileName(info, file.name)
  };
}

export function downloadFileWithName(file, newName) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = newName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
