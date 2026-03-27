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
