import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getProfile, updateProfile, updatePassword, getAllUsers, createUserByAdmin, updateUserByAdmin, setPasswordByAdmin, restoreAdmin, deleteUserById } from '../controllers/user.controller.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/restore-admin', restoreAdmin);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/password', updatePassword);
router.get('/', getAllUsers);
router.post('/', createUserByAdmin);
router.put('/:id/password', setPasswordByAdmin);
router.put('/:id', updateUserByAdmin);
router.delete('/:id', deleteUserById);

export default router;
