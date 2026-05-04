import express from 'express';
import multer from 'multer';
import {
  processExcelFile,
  processVoucherExcelFile,
  getVouchers,
  putVoucherUserState,
  removeVoucherListRow,
  restoreVoucherListRow,
  updateVoucherHistoryAction
} from '../controllers/excel.controller.js';
import {
  createVoucherManualRequest,
  getVoucherManualRequests,
  approveVoucherManualRequest,
  rejectVoucherManualRequest
} from '../controllers/voucherManualRequest.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { forbidPartnerRole } from '../middleware/forbidPartnerRole.js';

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

router.get('/vouchers', authenticateToken, forbidPartnerRole, getVouchers);
router.put('/voucher-user-state', authenticateToken, forbidPartnerRole, putVoucherUserState);
router.patch('/voucher-history-action', authenticateToken, forbidPartnerRole, updateVoucherHistoryAction);
router.post('/voucher-remove-row', authenticateToken, forbidPartnerRole, removeVoucherListRow);
router.post('/voucher-restore-row', authenticateToken, forbidPartnerRole, restoreVoucherListRow);
router.post('/upload', authenticateToken, forbidPartnerRole, upload.single('file'), processExcelFile);
router.post('/voucher-upload', authenticateToken, forbidPartnerRole, upload.single('file'), processVoucherExcelFile);

router.post('/voucher-manual-request', authenticateToken, forbidPartnerRole, createVoucherManualRequest);
router.get('/voucher-manual-requests', authenticateToken, forbidPartnerRole, getVoucherManualRequests);
router.post('/voucher-manual-request/:id/approve', authenticateToken, forbidPartnerRole, approveVoucherManualRequest);
router.post('/voucher-manual-request/:id/reject', authenticateToken, forbidPartnerRole, rejectVoucherManualRequest);

export default router;
