import product from '../models/ProductModel.js';

const productController = {

    findALL: async (req, res) => {
      try {
        const result = await product.findAll();
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    },
  
    findOne: async (req, res) => {
      try {
        const result = await product.findByPk(req.params.id);
        if (!result) {
          return res.status(404).json({ message: 'Produto não encontrado' });
        }
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    }
  
  }
  
  export default productController;






