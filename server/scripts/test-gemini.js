/**
 * Auf dem Server: cd ~/az-handy.berlin-Anwendung/server && node scripts/test-gemini.js
 * Druckt keinen Key, nur Länge/Status.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(dir, '..', '.env') });
dotenv.config({ path: path.join(dir, '..', '..', '.env') });

const key = String(process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
console.log('key', key ? `SET len=${key.length} prefix=${key.slice(0, 4)}` : 'MISSING');
if (!key) process.exit(1);

const list = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
const listed = await list.json().catch(() => ({}));
if (listed.error) {
  console.log('list', list.status, listed.error.status, listed.error.message);
} else {
  const names = (listed.models || [])
    .map((m) => String(m.name || '').replace(/^models\//, ''))
    .filter((n) => /flash|lite/i.test(n) && !/image|tts|live|audio/i.test(n))
    .slice(0, 12);
  console.log('list', list.status, names.join(', ') || '(none)');
}

const model = process.env.GEMINI_MODEL || namesFrom(listed) || 'gemini-3.8-flash';
const gen = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Reply with the single word OK' }] }]
    })
  }
);
const body = await gen.json().catch(() => ({}));
console.log(
  'generate',
  model,
  gen.status,
  body.error?.message || body.candidates?.[0]?.content?.parts?.[0]?.text || 'empty'
);

function namesFrom(payload) {
  return (payload.models || [])
    .map((m) => String(m.name || '').replace(/^models\//, ''))
    .find((n) => /flash/i.test(n) && !/image|tts|live|audio/i.test(n));
}
