/**
 * Entfernt iframe/embed/object/script aus Rich-Text-HTML.
 * Verhindert Chrome-Fehler (chrome-error://chromewebdata) und Einbettungen fremder Seiten.
 */
export function sanitizeRichTextHtml(html) {
  if (html == null || typeof html !== 'string') return '';
  let s = html;

  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');
  s = s.replace(/<iframe\b[^>]*\/?>/gi, '');
  s = s.replace(/<embed\b[^>]*\/?>/gi, '');
  s = s.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '');
  s = s.replace(/<object\b[^>]*\/?>/gi, '');

  return s;
}
