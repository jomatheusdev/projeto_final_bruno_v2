import user from '../models/UserModel.js'; 
import dotenv from 'dotenv';

dotenv.config();

const userController = {
  create: async (req, res) => {
    console.log("chegou");
    try {
      const result = await user.create(req.body);
      console.log("chegou aqui");
      res.status(201).json(result);
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      res.status(500).json({ message: error.message });
    }
  },

  findOne: async (req, res) => {
    try {
      const result = await user.findByPk(req.params.id); 
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const result = await user.update(req.body, {
        where: { id: req.params.id }
      });
      res.status(200).json({ message: 'Usuário atualizado', result });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      const result = await user.destroy({
        where: { id: req.params.id }
      });
      res.status(200).json({ message: 'Usuário deletado com sucesso' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  login: (req, res) => {
    res.status(200).json({ message: 'Login ainda não implementado' });
  }
};

export default userController;
