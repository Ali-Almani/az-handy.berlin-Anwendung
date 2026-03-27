import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { getDataDir } from '../utils/filePersistence.js';

const newsUploadDir = path.join(getDataDir(), 'uploads', 'news');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      fs.mkdirSync(newsUploadDir, { recursive: true });
    } catch {
      /* ignore */
    }
    cb(null, newsUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const extSafe = allowed.includes(ext) ? ext : '';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extSafe || '.bin'}`);
  }
});

const allowedImageMime = /^image\/(jpeg|jpg|png|gif|webp)$/i;

function isAllowedNewsImage(file) {
  const mime = String(file.mimetype || '').trim().toLowerCase();
  const name = String(file.originalname || '').toLowerCase();

  if (allowedImageMime.test(mime)) return true;

  if (/\.(jpe?g|png|gif|webp)$/.test(name)) {
    if (!mime || mime === 'application/octet-stream') return true;
  }

  return false;
}

export const newsUpload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (isAllowedNewsImage(file)) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilder (JPEG, PNG, GIF, WebP) erlaubt'));
    }
  }
});

const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      fs.mkdirSync(newsUploadDir, { recursive: true });
    } catch {
      /* ignore */
    }
    cb(null, newsUploadDir);
  },
  filename: (req, file, cb) => {
    const mime = String(file.mimetype || '').toLowerCase();
    let ext = path.extname(file.originalname || '').toLowerCase();
    const allowedExt = ['.webm', '.ogg', '.opus', '.mp3', '.mpeg', '.wav', '.m4a', '.mp4'];
    if (!allowedExt.includes(ext)) {
      if (mime.includes('webm')) ext = '.webm';
      else if (mime.includes('ogg')) ext = '.ogg';
      else if (mime.includes('mpeg') || mime === 'audio/mp3') ext = '.mp3';
      else if (mime.includes('mp4') || mime.includes('m4a')) ext = '.m4a';
      else if (mime.includes('wav')) ext = '.wav';
      else ext = '.webm';
    }
    cb(null, `audio-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
  }
});

const AUDIO_MIME_RE = /^audio\/(webm|ogg|opus|mpeg|mp3|mp4|wav|x-m4a|x-wav)$/i;

function isAllowedAnweisungAudio(file) {
  const mime = String(file.mimetype || '').trim().toLowerCase();
  const name = String(file.originalname || '').toLowerCase();
  if (mime === 'video/webm') return true;
  if (AUDIO_MIME_RE.test(mime)) return true;
  if (/\.(webm|ogg|opus|mp3|mpeg|wav|m4a|mp4)$/.test(name)) {
    if (!mime || mime === 'application/octet-stream') return true;
  }
  return false;
}

/** Sprachnachrichten für Admin-Anweisung (Browser-Aufnahme: meist WebM/Opus) */
export const anweisungAudioUpload = multer({
  storage: audioStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (isAllowedAnweisungAudio(file)) {
      cb(null, true);
    } else {
      cb(new Error('Nur Audio (WebM, OGG, MP3, M4A, WAV, …) erlaubt'));
    }
  }
});
