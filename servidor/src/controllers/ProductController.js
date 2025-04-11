import product from '../models/ProductModel.js';

const productController = {

    findALL: async (req, res) => {
      try {
        const result = await product.findALL(req, res);
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    },
  
    findOne: async (req, res) => {
      try {
        const result = await product.findOne(req.params.id);
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    }
  
  }
  
  export default productController;
  





  