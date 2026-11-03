import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  verifyWhatsAppWebhook,
  handleWhatsAppWebhookPost,
  serveWhatsAppFile,
  listWhatsAppTickets,
  sendWhatsAppTicketMessage,
  patchWhatsAppTicketHandler,
  deleteWhatsAppTicketHandler,
  deleteWhatsAppMessageHandler
} from '../controllers/whatsapp.controller.js';

const router = Router();

router.get('/webhook', verifyWhatsAppWebhook);
router.post('/webhook', handleWhatsAppWebhookPost);
router.get('/files/:name', serveWhatsAppFile);

router.use(authenticateToken);
router.get('/tickets', listWhatsAppTickets);
router.post('/tickets/:id/messages', sendWhatsAppTicketMessage);
router.post('/tickets/:id/messages/delete', deleteWhatsAppMessageHandler);
router.delete('/tickets/:id/messages/:messageId', deleteWhatsAppMessageHandler);
router.patch('/tickets/:id', patchWhatsAppTicketHandler);
router.delete('/tickets/:id', deleteWhatsAppTicketHandler);

export default router;
