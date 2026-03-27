import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  formularPdfUpload,
  FORMULAR_CENTER_MAX_FILE_BYTES
} from '../middleware/formularPdfUpload.js';
import {
  getFormularCenterItems,
  uploadFormularCenterPdf,
  deleteFormularCenterItem
} from '../controllers/formularCenter.controller.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getFormularCenterItems);

router.post('/upload', (req, res, next) => {
  formularPdfUpload.single('file')(req, res, (err) => {
    if (err) {
      const code = err.code;
      const maxMb = Math.round(FORMULAR_CENTER_MAX_FILE_BYTES / (1024 * 1024));
      if (code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          message: `Datei zu groß (max. ${maxMb} MB).`
        });
      }
      const msg = err.message || 'Upload fehlgeschlagen';
      return res.status(400).json({ success: false, message: msg });
    }
    next();
  });
}, uploadFormularCenterPdf);

router.delete('/:id', deleteFormularCenterItem);

export default router;
