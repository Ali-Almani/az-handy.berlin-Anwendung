import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { getDataDir } from '../utils/filePersistence.js';

/** Cloud-API: Dokumente bis 100 MB. Native Videos nur 16 MB – größere Videos gehen als Datei. */
export const WHATSAPP_FILE_MAX_BYTES = 100 * 1024 * 1024;
export const WHATSAPP_NATIVE_VIDEO_MAX_BYTES = 16 * 1024 * 1024;

const uploadDir = path.join(getDataDir(), 'uploads', 'whatsapp');

function baseMime(file) {
  return String(file.mimetype || '')
    .trim()
    .toLowerCase()
    .split(';')[0]
    .trim();
}

function safeExt(file) {
  const name = String(file.originalname || '').toLowerCase();
  const ext = path.extname(name);
  const allowed = new Set(['.mp4', '.mov', '.3gp', '.3gpp', '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp']);
  if (allowed.has(ext)) {
    if (ext === '.3gpp') return '.3gp';
    if (ext === '.jpeg') return '.jpg';
    return ext;
  }
  const mime = baseMime(file);
  if (mime === 'application/pdf') return '.pdf';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/gif') return '.gif';
  if (mime.startsWith('image/')) return '.jpg';
  if (mime.includes('quicktime')) return '.mov';
  if (mime.includes('3gpp') || mime.includes('3gp')) return '.3gp';
  if (mime.startsWith('video/')) return '.mp4';
  return '.bin';
}

function isAllowedWhatsAppFile(file) {
  const mime = baseMime(file);
  const name = String(file.originalname || '').toLowerCase();
  if (mime.startsWith('video/')) return true;
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return true;
  if (mime === 'application/octet-stream' && /\.(mp4|mov|3gp|3gpp|pdf)$/i.test(name)) return true;
  return false;
}

function isAllowedTicketDokument(file) {
  const mime = baseMime(file);
  const name = String(file.originalname || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return true;
  if (mime === 'application/octet-stream' && /\.(pdf|jpe?g|png|gif|webp)$/i.test(name)) return true;
  return false;
}

export const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;

export const whatsappDocumentUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        fs.mkdirSync(uploadDir, { recursive: true });
      } catch {
        /* ignore */
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt(file)}`);
    }
  }),
  limits: { fileSize: DOCUMENT_MAX_BYTES },
  fileFilter: (req, file, cb) => {
    if (isAllowedTicketDokument(file)) cb(null, true);
    else cb(new Error('Nur PDF oder Bilder erlaubt.'));
  }
});

export const whatsappMediaUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        fs.mkdirSync(uploadDir, { recursive: true });
      } catch {
        /* ignore */
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt(file)}`);
    }
  }),
  limits: { fileSize: WHATSAPP_FILE_MAX_BYTES },
  fileFilter: (req, file, cb) => {
    if (isAllowedWhatsAppFile(file)) cb(null, true);
    else cb(new Error('Nur Video (MP4) oder PDF erlaubt.'));
  }
});
