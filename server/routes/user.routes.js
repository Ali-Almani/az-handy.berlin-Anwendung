import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { forbidPartnerRole } from '../middleware/forbidPartnerRole.js';
import {
  getProfile,
  updateProfile,
  updatePassword,
  getDirectoryUsers,
  getDirectoryUserById,
  getMitarbeiterShopTshirtGroessenForMarketing,
  getAllUsers,
  createUserByAdmin,
  updateUserByAdmin,
  setPasswordByAdmin,
  restoreAdmin,
  deleteUserById
} from '../controllers/user.controller.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/password', updatePassword);

router.get('/directory', getDirectoryUsers);
router.get('/directory/:id', getDirectoryUserById);
router.get('/mitarbeiter-shop-tshirt-groessen', getMitarbeiterShopTshirtGroessenForMarketing);

router.use(forbidPartnerRole);

router.post('/restore-admin', restoreAdmin);
router.get('/', getAllUsers);
router.post('/', createUserByAdmin);
router.put('/:id/password', setPasswordByAdmin);
router.put('/:id', updateUserByAdmin);
router.delete('/:id', deleteUserById);

export default router;
