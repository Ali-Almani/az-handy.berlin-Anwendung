import express from 'express';
import multer from 'multer';
import { processExcelFile } from '../controllers/excel.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nur Excel-Dateien (.xlsx, .xls) oder CSV-Dateien sind erlaubt'), false);
    }
  }
});

router.post('/upload', authenticateToken, upload.single('file'), processExcelFile);

export default router;
