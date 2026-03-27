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
    const ext = path.extname(file.originalname || '').toLowerCase();
    const useExt = ext === '.pdf' ? '.pdf' : '.pdf';
    cb(null, `formular-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${useExt}`);
  }
});

const PDF_MIME = /^application\/pdf$/i;

function isPdf(file) {
  const mime = String(file.mimetype || '').trim().toLowerCase();
  const name = String(file.originalname || '').toLowerCase();
  if (PDF_MIME.test(mime)) return true;
  if (name.endsWith('.pdf') && (!mime || mime === 'application/octet-stream')) return true;
  return false;
}

export const formularPdfUpload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (isPdf(file)) {
      cb(null, true);
    } else {
      cb(new Error('Nur PDF-Dateien sind erlaubt'));
    }
  }
});
