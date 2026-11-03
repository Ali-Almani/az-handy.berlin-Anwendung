import { spawn } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let lamejs = null;
try {
  lamejs = require('lamejs');
} catch {
  lamejs = null;
}

const WHATSAPP_AUDIO = new Set([
  'audio/aac',
  'audio/mp4',
  'audio/mpeg',
  'audio/amr',
  'audio/ogg',
  'audio/opus'
]);

function parseWavPcm(buffer) {
  if (!buffer || buffer.length < 44) return null;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') return null;
  let offset = 12;
  let channels = 1;
  let sampleRate = 16000;
  let bits = 16;
  let dataStart = -1;
  let dataSize = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const next = offset + 8 + size;
    if (id === 'fmt ') {
      channels = buffer.readUInt16LE(offset + 10);
      sampleRate = buffer.readUInt32LE(offset + 12);
      bits = buffer.readUInt16LE(offset + 22);
    } else if (id === 'data') {
      dataStart = offset + 8;
      dataSize = size;
      break;
    }
    offset = next + (size % 2);
  }
  if (dataStart < 0 || bits !== 16) return null;
  const pcm = buffer.subarray(dataStart, Math.min(buffer.length, dataStart + dataSize));
  let samples;
  if (channels === 1) {
    samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));
  } else {
    const frames = Math.floor(pcm.length / 2 / channels);
    samples = new Int16Array(frames);
    for (let i = 0; i < frames; i += 1) {
      let sum = 0;
      for (let c = 0; c < channels; c += 1) sum += pcm.readInt16LE((i * channels + c) * 2);
      samples[i] = Math.max(-32768, Math.min(32767, Math.round(sum / channels)));
    }
  }
  return { samples, sampleRate };
}

function pcmToMp3(samples, sampleRate) {
  if (!lamejs?.Mp3Encoder) return null;
  const rate = sampleRate >= 32000 ? 44100 : 16000;
  let pcm = samples;
  if (sampleRate !== rate) {
    const outLen = Math.max(1, Math.round(samples.length * (rate / sampleRate)));
    const next = new Int16Array(outLen);
    const ratio = samples.length / outLen;
    for (let i = 0; i < outLen; i += 1) next[i] = samples[Math.min(samples.length - 1, Math.floor(i * ratio))];
    pcm = next;
  }
  const encoder = new lamejs.Mp3Encoder(1, rate, 32);
  const chunk = 1152;
  const parts = [];
  for (let i = 0; i < pcm.length; i += chunk) {
    const slice = pcm.subarray(i, i + chunk);
    const buf = encoder.encodeBuffer(slice);
    if (buf?.length) parts.push(Buffer.from(buf));
  }
  const end = encoder.flush();
  if (end?.length) parts.push(Buffer.from(end));
  if (!parts.length) return null;
  return Buffer.concat(parts);
}

function runFfmpeg(buffer, args) {
  return new Promise((resolve) => {
    const child = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const out = [];
    child.stdout.on('data', (chunk) => out.push(chunk));
    child.on('error', () => resolve(null));
    child.on('close', (code) => {
      if (code !== 0) return resolve(null);
      resolve(Buffer.concat(out));
    });
    child.stdin.on('error', () => {});
    child.stdin.end(buffer);
  });
}

export async function prepareWhatsAppAudio(buffer, mime) {
  const type = String(mime || '').split(';')[0].trim().toLowerCase();
  if (WHATSAPP_AUDIO.has(type) && type !== 'audio/opus') {
    return { buffer, mime: type === 'audio/opus' ? 'audio/ogg' : type };
  }
  if (type === 'audio/wav' || type === 'audio/x-wav' || type === 'audio/wave') {
    const parsed = parseWavPcm(buffer);
    const mp3 = parsed ? pcmToMp3(parsed.samples, parsed.sampleRate) : null;
    if (mp3?.length) return { buffer: mp3, mime: 'audio/mpeg' };
  }
  const ogg = await runFfmpeg(buffer, ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-ac', '1', '-ar', '16000', '-c:a', 'libopus', '-f', 'ogg', 'pipe:1']);
  if (ogg?.length) return { buffer: ogg, mime: 'audio/ogg' };
  const mp3 = await runFfmpeg(buffer, ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-ac', '1', '-ar', '16000', '-c:a', 'libmp3lame', '-b:a', '32k', '-f', 'mp3', 'pipe:1']);
  if (mp3?.length) return { buffer: mp3, mime: 'audio/mpeg' };
  const parsed = parseWavPcm(buffer);
  const encoded = parsed ? pcmToMp3(parsed.samples, parsed.sampleRate) : null;
  if (encoded?.length) return { buffer: encoded, mime: 'audio/mpeg' };
  const err = new Error('whatsapp_audio');
  err.detail = 'Sprachnachricht konnte nicht in ein WhatsApp-Format umgewandelt werden.';
  throw err;
}
