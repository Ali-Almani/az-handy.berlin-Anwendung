import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { getDataDir } from '../utils/filePersistence.js';

const uploadDir = path.join(getDataDir(), 'uploads', 'formular-center');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch {
      /* ignore */
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = getSafeExtension(file);
    cb(null, `formular-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
  }
});

/** Darf `client_max_body_size` am Reverse-Proxy (z. B. Nginx) nicht überschreiten, sonst 413 bevor Multer greift. */
export const FORMULAR_CENTER_MAX_FILE_BYTES = 100 * 1024 * 1024;

const PDF_MIME = /^application\/pdf$/i;
const DOC_MIME = /^application\/msword$/i;
const DOCX_MIME =
  /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/i;

const ALLOWED_EXT = new Set(['.pdf', '.doc', '.docx']);

function getSafeExtension(file) {
  const name = String(file.originalname || '').toLowerCase();
  const fromName = path.extname(name);
  if (ALLOWED_EXT.has(fromName)) return fromName;
  const mime = String(file.mimetype || '').trim().toLowerCase();
  if (PDF_MIME.test(mime)) return '.pdf';
  if (DOC_MIME.test(mime)) return '.doc';
  if (DOCX_MIME.test(mime)) return '.docx';
  if (!mime || mime === 'application/octet-stream') {
    if (name.endsWith('.pdf')) return '.pdf';
    if (name.endsWith('.docx')) return '.docx';
    if (name.endsWith('.doc')) return '.doc';
  }
  return '.pdf';
}

function isAllowedFormularDocument(file) {
  const name = String(file.originalname || '').toLowerCase();
  const ext = path.extname(name);
  if (ALLOWED_EXT.has(ext)) return true;
  const mime = String(file.mimetype || '').trim().toLowerCase();
  if (PDF_MIME.test(mime)) return true;
  if (DOC_MIME.test(mime)) return true;
  if (DOCX_MIME.test(mime)) return true;
  return false;
}

export const formularCenterUpload = multer({
  storage,
  limits: { fileSize: FORMULAR_CENTER_MAX_FILE_BYTES },
  fileFilter: (req, file, cb) => {
    if (isAllowedFormularDocument(file)) {
      cb(null, true);
    } else {
      cb(new Error('Nur PDF- und Word-Dateien (.pdf, .doc, .docx) sind erlaubt'));
    }
  }
});

/** @deprecated – Alias; nutze formularCenterUpload */
export const formularPdfUpload = formularCenterUpload;
