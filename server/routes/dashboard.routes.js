import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getNote, saveNote, getHistory, getNews, markNewsAsRead, getNewsReaders, getNewsArchive, updateNewsArchiveEntry, deleteNewsArchiveEntry } from '../controllers/dashboard.controller.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/news/archive', getNewsArchive);
router.put('/news/archive/:id', updateNewsArchiveEntry);
router.delete('/news/archive/:id', deleteNewsArchiveEntry);
router.get('/news', getNews);
router.post('/news/read', markNewsAsRead);
router.get('/news/readers', getNewsReaders);
router.get('/note', getNote);
router.put('/note', saveNote);
router.get('/note/history', getHistory);

export default router;
