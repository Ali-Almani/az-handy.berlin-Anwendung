import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { formularCenterUpload, FORMULAR_CENTER_MAX_FILE_BYTES } from '../middleware/formularPdfUpload.js';
import {
  getFormularCenterItems,
  uploadFormularCenterPdf,
  deleteFormularCenterItem,
  downloadFormularCenterFile,
  patchFormularCenterItem,
  replaceFormularCenterFile,
  createFormularSection,
  patchFormularSection,
  deleteFormularSection,
  moveFormularSection,
  moveFormularItem
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

router.get('/', getFormularCenterItems);
router.get('/download/:id', downloadFormularCenterFile);

router.post('/upload', authenticateToken, formularUploadMiddleware, uploadFormularCenterPdf);

router.post('/sections', authenticateToken, createFormularSection);
router.patch('/sections/:sectionId', authenticateToken, patchFormularSection);
router.delete('/sections/:sectionId', authenticateToken, deleteFormularSection);
router.post('/sections/:sectionId/move', authenticateToken, moveFormularSection);

router.post('/items/:itemId/move', authenticateToken, moveFormularItem);
router.post('/items/:itemId/replace', authenticateToken, formularUploadMiddleware, replaceFormularCenterFile);
router.patch('/items/:itemId', authenticateToken, patchFormularCenterItem);
router.delete('/items/:itemId', authenticateToken, deleteFormularCenterItem);

export default router;
