import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { newsUpload } from '../middleware/newsUpload.js';
import {
  getNote,
  saveNote,
  getHistory,
  getNews,
  markNewsAsRead,
  getNewsReaders,
  getNewsArchive,
  updateNewsArchiveEntry,
  deleteNewsArchiveEntry,
  getPerformanceMetrics,
  savePerformanceMetrics,
  getSiteNews,
  saveSiteNews,
  uploadNewsFile
} from '../controllers/dashboard.controller.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/site-news', getSiteNews);
router.put('/site-news', saveSiteNews);
router.post('/news/upload', (req, res, next) => {
  newsUpload.single('file')(req, res, (err) => {
    if (err) {
      const code = err.code;
        const msg =
        code === 'LIMIT_FILE_SIZE'
          ? 'Bild zu groß (max. 15 MB)'
          : err.message || 'Upload fehlgeschlagen';
      return res.status(400).json({ message: msg, code: code || undefined });
    }
    next();
  });
}, uploadNewsFile);

router.get('/performance', getPerformanceMetrics);
router.put('/performance', savePerformanceMetrics);
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
