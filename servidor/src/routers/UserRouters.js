import express from 'express';
import userController from '../controllers/UserController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/user')
  .post(userController.create);

router.route('/user/:id')
  .get(authMiddleware, userController.findOne) // Protegido
  .put(authMiddleware, userController.update) // Protegido
  .delete(authMiddleware, userController.delete); // Protegido

router.route('/login')
  .post(userController.login); // Rota de login

export default router;
