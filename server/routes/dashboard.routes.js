import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getNote, saveNote, getHistory, getNews, markNewsAsRead, getNewsReaders } from '../controllers/dashboard.controller.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/news', getNews);
router.post('/news/read', markNewsAsRead);
router.get('/news/readers', getNewsReaders);
router.get('/note', getNote);
router.put('/note', saveNote);
router.get('/note/history', getHistory);

export default router;
