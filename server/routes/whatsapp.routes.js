import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { whatsappMediaUpload, whatsappDocumentUpload, WHATSAPP_FILE_MAX_BYTES, DOCUMENT_MAX_BYTES } from '../middleware/whatsappMediaUpload.js';
import {
  verifyWhatsAppWebhook,
  handleWhatsAppWebhookPost,
  serveWhatsAppFile,
  listWhatsAppTickets,
  sendWhatsAppTicketMessage,
  sendWhatsAppTicketMedia,
  uploadTicketDocumentHandler,
  patchWhatsAppTicketHandler,
  deleteWhatsAppTicketHandler,
  deleteWhatsAppMessageHandler,
  getAutoQuestionFlowHandler,
  saveAutoQuestionFlowHandler,
  getInboxGroupsHandler,
  saveInboxGroupsHandler
} from '../controllers/whatsapp.controller.js';

const router = Router();

function handleWhatsAppMulterError(err, req, res, next, maxBytes = WHATSAPP_FILE_MAX_BYTES) {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const maxMb = Math.round(maxBytes / (1024 * 1024));
      return res.status(413).json({
        success: false,
        message: `Datei zu groß (max. ${maxMb} MB).`
      });
    }
    return res.status(400).json({ success: false, message: err.message || 'Upload fehlgeschlagen.' });
  }
  return next();
}

const whatsappFileUpload = (req, res, next) => {
  whatsappMediaUpload.single('file')(req, res, (err) => handleWhatsAppMulterError(err, req, res, next));
};

const ticketDocumentUpload = (req, res, next) => {
  whatsappDocumentUpload.single('file')(req, res, (err) => (
    handleWhatsAppMulterError(err, req, res, next, DOCUMENT_MAX_BYTES)
  ));
};

router.get('/webhook', verifyWhatsAppWebhook);
router.post('/webhook', handleWhatsAppWebhookPost);
router.get('/files/:name', serveWhatsAppFile);

router.use(authenticateToken);
router.get('/tickets', listWhatsAppTickets);
router.get('/auto-flow', getAutoQuestionFlowHandler);
router.put('/auto-flow', saveAutoQuestionFlowHandler);
router.get('/inbox-groups', getInboxGroupsHandler);
router.put('/inbox-groups', saveInboxGroupsHandler);
router.post('/tickets/:id/messages', sendWhatsAppTicketMessage);
router.post('/tickets/:id/media', whatsappFileUpload, sendWhatsAppTicketMedia);
router.post('/tickets/:id/documents', ticketDocumentUpload, uploadTicketDocumentHandler);
router.post('/tickets/:id/messages/delete', deleteWhatsAppMessageHandler);
router.delete('/tickets/:id/messages/:messageId', deleteWhatsAppMessageHandler);
router.patch('/tickets/:id', patchWhatsAppTicketHandler);
router.delete('/tickets/:id', deleteWhatsAppTicketHandler);

export default router;
