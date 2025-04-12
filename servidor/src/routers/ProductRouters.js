import express from 'express';
import productController from '../controllers/ProductController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

// Rota pública para listar produtos (acessível sem autenticação)
router.route('/public/products')
  .get(productController.findALL);

// Rotas protegidas que requerem autenticação
router.route('/product')
  .get(authMiddleware, productController.findALL);

router.route('/product/:id')
  .get(authMiddleware, productController.findOne);

// Rotas para gerenciar o carrinho
router.route('/cart')
  .get(authMiddleware, productController.getCart)
  .post(authMiddleware, productController.addToCart)
  .delete(authMiddleware, productController.clearCart);

router.route('/cart/:id')
  .delete(authMiddleware, productController.removeFromCart);

export default router;