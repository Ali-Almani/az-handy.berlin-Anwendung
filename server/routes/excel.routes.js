import express from 'express';
import multer from 'multer';
import {
  processExcelFile,
  processVoucherExcelFile,
  getVouchers,
  putVoucherUserState,
  removeVoucherListRow,
  restoreVoucherListRow
} from '../controllers/excel.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024
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

router.get('/vouchers', authenticateToken, getVouchers);
router.put('/voucher-user-state', authenticateToken, putVoucherUserState);
router.post('/voucher-remove-row', authenticateToken, removeVoucherListRow);
router.post('/voucher-restore-row', authenticateToken, restoreVoucherListRow);
router.post('/upload', authenticateToken, upload.single('file'), processExcelFile);
router.post('/voucher-upload', authenticateToken, upload.single('file'), processVoucherExcelFile);

export default router;
