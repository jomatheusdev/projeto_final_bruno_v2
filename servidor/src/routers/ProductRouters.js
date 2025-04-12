import express from 'express';
import productController from '../controllers/ProductController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/product')
  .get(authMiddleware, productController.findALL);  // Corrigido para não usar callback anônima

router.route('/product/:id')
  .get(authMiddleware, productController.findOne);  // Corrigido para não usar callback anônima

export default router;