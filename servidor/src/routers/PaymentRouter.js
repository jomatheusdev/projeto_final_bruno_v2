import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
// import paymentController from '../controllers/PaymentController.js';

const router = express.Router();

// Rotas de pagamento serão implementadas aqui
// router.route('/payment')
//   .post(authMiddleware, paymentController.create);

export default router;
