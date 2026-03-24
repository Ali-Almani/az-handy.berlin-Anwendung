/**
 * Entfernt iframe/embed/object/script/frame aus Rich-Text-HTML (API + gespeicherte Daten).
 */
export function sanitizeRichTextHtml(html) {
  if (html == null || typeof html !== 'string') return '';
  let s = html;

  s = s.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '');
  s = s.replace(/<iframe\b[\s\S]*?\/>/gi, '');
  s = s.replace(/<iframe\b[\s\S]*?>/gi, '');
  s = s.replace(/<embed\b[\s\S]*?>/gi, '');
  s = s.replace(/<object\b[\s\S]*?<\/object>/gi, '');
  s = s.replace(/<object\b[\s\S]*?>/gi, '');
  s = s.replace(/<frame\b[\s\S]*?>/gi, '');
  s = s.replace(/<frameset\b[\s\S]*?<\/frameset>/gi, '');

  return s;
}
