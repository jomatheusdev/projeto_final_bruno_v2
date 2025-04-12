import express from 'express';
import AIController from '../controllers/AIController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

// Todas as rotas de IA exigem autenticação
router.use(authMiddleware);

// Rotas para enriquecimento de contexto da IA
router.get('/ai/orders', AIController.getUserOrderHistory);
router.get('/ai/stats', AIController.getUserPurchaseStats);
router.post('/ai/context', AIController.enrichUserContext);

export default router;
