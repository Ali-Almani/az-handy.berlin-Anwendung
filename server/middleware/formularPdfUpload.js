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

const ALLOWED_EXT = new Set(['.pdf', '.doc', '.docx', '.xlsx', '.xls', '.mp4']);

/** Browser/Proxy hängen oft "; charset=…" o. Ä. an – ohne Normalisierung schlagen strikte Regex-Checks fehl. */
function baseMime(file) {
  return String(file.mimetype || '')
    .trim()
    .toLowerCase()
    .split(';')[0]
    .trim();
}

function mimeLooksPdf(m) {
  return m === 'application/pdf';
}

function mimeLooksWordBinary(m) {
  return (
    m === 'application/msword' ||
    m === 'application/vnd.ms-word' ||
    m === 'application/vnd.ms-word.document.macroenabled.12' ||
    m.startsWith('application/vnd.ms-word.')
  );
}

function mimeLooksDocx(m) {
  return (
    m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    m.includes('wordprocessingml.document')
  );
}

function mimeLooksXlsx(m) {
  return (
    m === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    m.includes('spreadsheetml.sheet')
  );
}

function mimeLooksXls(m) {
  return m === 'application/vnd.ms-excel' || m.startsWith('application/vnd.ms-excel');
}

function mimeLooksMp4(m) {
  return m === 'video/mp4' || m === 'video/x-m4v';
}

function getSafeExtension(file) {
  const name = String(file.originalname || '').toLowerCase();
  const fromName = path.extname(name);
  if (ALLOWED_EXT.has(fromName)) return fromName;
  const mime = baseMime(file);
  if (mimeLooksPdf(mime)) return '.pdf';
  if (mimeLooksDocx(mime)) return '.docx';
  if (mime === 'application/zip' && name.endsWith('.docx')) return '.docx';
  if (mimeLooksWordBinary(mime)) return '.doc';
  if (mimeLooksXlsx(mime)) return '.xlsx';
  if (mimeLooksXls(mime)) return '.xls';
  if (mimeLooksMp4(mime)) return '.mp4';
  if (mime === 'application/zip' && name.endsWith('.xlsx')) return '.xlsx';
  if (!mime || mime === 'application/octet-stream') {
    if (name.endsWith('.pdf')) return '.pdf';
    if (name.endsWith('.docx')) return '.docx';
    if (name.endsWith('.doc')) return '.doc';
    if (name.endsWith('.xlsx')) return '.xlsx';
    if (name.endsWith('.xls')) return '.xls';
    if (name.endsWith('.mp4')) return '.mp4';
  }
  if (name.endsWith('.xlsx')) return '.xlsx';
  if (name.endsWith('.xls')) return '.xls';
  if (name.endsWith('.mp4')) return '.mp4';
  return '.pdf';
}

function isAllowedFormularDocument(file) {
  const name = String(file.originalname || '').toLowerCase();
  const ext = path.extname(name);
  if (ALLOWED_EXT.has(ext)) return true;
  const mime = baseMime(file);
  if (mimeLooksPdf(mime)) return true;
  if (mimeLooksWordBinary(mime)) return true;
  if (mimeLooksDocx(mime)) return true;
  if (mime === 'application/zip' && name.endsWith('.docx')) return true;
  if (mimeLooksXlsx(mime)) return true;
  if (mimeLooksXls(mime)) return true;
  if (mimeLooksMp4(mime)) return true;
  if (mime === 'application/zip' && name.endsWith('.xlsx')) return true;
  if (mime === 'application/octet-stream' && name.match(/\.(pdf|doc|docx|xlsx|xls|mp4)$/i)) return true;
  return false;
}

export const formularCenterUpload = multer({
  storage,
  limits: { fileSize: FORMULAR_CENTER_MAX_FILE_BYTES },
  fileFilter: (req, file, cb) => {
    if (isAllowedFormularDocument(file)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Nur PDF-, Word-, Excel- und Video-Dateien (.pdf, .doc, .docx, .xlsx, .xls, .mp4) sind erlaubt'
        )
      );
    }
  }
});

/** @deprecated – Alias; nutze formularCenterUpload */
export const formularPdfUpload = formularCenterUpload;
