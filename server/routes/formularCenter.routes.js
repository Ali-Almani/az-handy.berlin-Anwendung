import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { formularPdfUpload } from '../middleware/formularPdfUpload.js';
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
      const msg =
        code === 'LIMIT_FILE_SIZE'
          ? 'Datei zu groß (max. 30 MB)'
          : err.message || 'Upload fehlgeschlagen';
      return res.status(400).json({ success: false, message: msg });
    }
    next();
  });
}, uploadFormularCenterPdf);

router.delete('/:id', deleteFormularCenterItem);

export default router;
