import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  formularCenterUpload,
  FORMULAR_CENTER_MAX_FILE_BYTES
} from '../middleware/formularPdfUpload.js';
import {
  getFormularCenterItems,
  uploadFormularCenterPdf,
  deleteFormularCenterItem,
  downloadFormularCenterFile,
  patchFormularCenterItem,
  replaceFormularCenterFile
} from '../controllers/formularCenter.controller.js';

const router = express.Router();

const handleFormularMulterError = (err, req, res, next) => {
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
  return next();
};

const formularUploadMiddleware = (req, res, next) => {
  formularCenterUpload.single('file')(req, res, (err) => handleFormularMulterError(err, req, res, next));
};

/** Öffentlich: alle können die Liste sehen; Download über API mit korrekten Inhaltstypen. */
router.get('/', getFormularCenterItems);
router.get('/download/:id', downloadFormularCenterFile);

router.post('/upload', authenticateToken, formularUploadMiddleware, uploadFormularCenterPdf);
router.post('/:id/replace', authenticateToken, formularUploadMiddleware, replaceFormularCenterFile);
router.patch('/:id', authenticateToken, patchFormularCenterItem);

router.delete('/:id', authenticateToken, deleteFormularCenterItem);

export default router;
