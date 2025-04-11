import express from 'express';
import productController from '../controllers/ProductController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/product')
  .get(authMiddleware, (req, res) => productController.findALL(req, res)); // Protegido

router.route('/product/:id')
  .get(authMiddleware, (req, res) => productController.findOne(req, res)); // Protegido

export default router;