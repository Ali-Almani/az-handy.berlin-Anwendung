import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  listMnpEntries,
  getMnpEntry,
  createMnpEntry,
  updateMnpEntry,
  deleteMnpEntry
} from '../controllers/mnp.controller.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', listMnpEntries);
router.get('/:id', getMnpEntry);
router.post('/', createMnpEntry);
router.patch('/:id', updateMnpEntry);
router.delete('/:id', deleteMnpEntry);

export default router;
