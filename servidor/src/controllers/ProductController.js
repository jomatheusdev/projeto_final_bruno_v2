import product from '../models/ProductModel.js';

// Armazenamento temporário de carrinhos (em produção seria armazenado em um banco de dados)
const userCarts = new Map();

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
    },
    
    // Obter o carrinho do usuário
    getCart: async (req, res) => {
      try {
        const userId = req.user.id;
        const cart = userCarts.get(userId) || [];
        res.json(cart);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    },
    
    // Adicionar item ao carrinho
    addToCart: async (req, res) => {
      try {
        const userId = req.user.id;
        const { productId, quantity = 1 } = req.body;
        
        if (!productId) {
          return res.status(400).json({ message: 'ID do produto é obrigatório' });
        }
        
        // Verificar se o produto existe
        const productItem = await product.findByPk(productId);
        if (!productItem) {
          return res.status(404).json({ message: 'Produto não encontrado' });
        }
        
        // Obter o carrinho atual ou criar um novo
        const cart = userCarts.get(userId) || [];
        
        // Verificar se o produto já está no carrinho
        const existingItemIndex = cart.findIndex(item => item.id === productId);
        
        if (existingItemIndex >= 0) {
          // Atualizar quantidade se o produto já estiver no carrinho
          cart[existingItemIndex].quantity += quantity;
        } else {
          // Adicionar novo item ao carrinho
          cart.push({
            id: productItem.id,
            name: productItem.name,
            price: productItem.price,
            quantity: quantity,
            imageUrl: productItem.imageUrl
          });
        }
        
        // Salvar o carrinho atualizado
        userCarts.set(userId, cart);
        
        res.status(200).json({ message: 'Produto adicionado ao carrinho', cart });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    },
    
    // Remover item do carrinho
    removeFromCart: async (req, res) => {
      try {
        const userId = req.user.id;
        const productId = req.params.id;
        
        // Obter o carrinho atual
        const cart = userCarts.get(userId) || [];
        
        // Filtrar o produto a ser removido
        const updatedCart = cart.filter(item => item.id !== productId);
        
        // Se o tamanho do carrinho não mudou, o produto não foi encontrado
        if (cart.length === updatedCart.length) {
          return res.status(404).json({ message: 'Produto não encontrado no carrinho' });
        }
        
        // Salvar o carrinho atualizado
        userCarts.set(userId, updatedCart);
        
        res.status(200).json({ message: 'Produto removido do carrinho', cart: updatedCart });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    },
    
    // Limpar o carrinho
    clearCart: async (req, res) => {
      try {
        const userId = req.user.id;
        
        // Limpar o carrinho do usuário
        userCarts.set(userId, []);
        
        res.status(200).json({ message: 'Carrinho esvaziado' });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    }
  }
  
  export default productController;






