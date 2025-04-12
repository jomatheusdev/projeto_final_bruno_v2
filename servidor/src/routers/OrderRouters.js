import express from 'express';
import orderController from '../controllers/OrderController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

// Todas as rotas de pedido exigem autenticação
router.use(authMiddleware);

// Cria um novo pedido
router.post('/orders', orderController.create);

// Obtém histórico de pedidos do usuário
router.get('/orders', orderController.getUserOrders);

// Obtém detalhes de um pedido específico
router.get('/orders/:id', orderController.getOrderDetails);

export default router;
