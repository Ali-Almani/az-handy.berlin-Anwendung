/** True if HTML likely has something a user would consider „Inhalt“ (Text, Bild, …). */
export function hasMeaningfulHtml(html) {
  if (html == null || typeof html !== 'string') return false;
  const s = html.trim();
  if (!s) return false;
  if (
    /<img\b/i.test(s) ||
    /<audio\b/i.test(s) ||
    /<video\b/i.test(s) ||
    /<iframe\b/i.test(s) ||
    /<picture\b/i.test(s) ||
    /<svg\b/i.test(s) ||
    /<canvas\b/i.test(s) ||
    /<table\b/i.test(s)
  ) {
    return true;
  }
  const text = s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 0;
}
