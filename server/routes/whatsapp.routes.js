import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  verifyWhatsAppWebhook,
  handleWhatsAppWebhookPost,
  listWhatsAppTickets,
  sendWhatsAppTicketMessage,
  patchWhatsAppTicketHandler,
  deleteWhatsAppTicketHandler,
  deleteWhatsAppMessageHandler
} from '../controllers/whatsapp.controller.js';

const router = Router();

router.get('/webhook', verifyWhatsAppWebhook);
router.post('/webhook', handleWhatsAppWebhookPost);

router.use(authenticateToken);
router.get('/tickets', listWhatsAppTickets);
router.post('/tickets/:id/messages', sendWhatsAppTicketMessage);
router.delete('/tickets/:id/messages/:messageId', deleteWhatsAppMessageHandler);
router.patch('/tickets/:id', patchWhatsAppTicketHandler);
router.delete('/tickets/:id', deleteWhatsAppTicketHandler);

export default router;
