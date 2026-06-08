import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  listVorvertraege,
  getVorvertrag,
  createVorvertrag,
  updateVorvertrag,
  deleteVorvertrag
} from '../controllers/vorvertrag.controller.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', listVorvertraege);
router.get('/:id', getVorvertrag);
router.post('/', createVorvertrag);
router.patch('/:id', updateVorvertrag);
router.delete('/:id', deleteVorvertrag);

export default router;
