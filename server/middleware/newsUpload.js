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
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];
    const extSafe = allowed.includes(ext) ? ext : '';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extSafe || '.bin'}`);
  }
});

export const newsUpload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^(image\/(jpeg|png|gif|webp)|application\/pdf)/.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Nur Bilder (JPEG, PNG, GIF, WebP) oder PDF erlaubt'));
  }
});
