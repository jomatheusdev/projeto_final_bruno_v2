import ProductSearchService from '../services/ProductSearchService.js';
import { logAI } from '../config/aiConfig.js';

/**
 * Controlador para funções de IA que interagem com os dados do usuário
 */
const AIController = {
  /**
   * Obtém o histórico de pedidos de um usuário para uso pela IA
   */
  getUserOrderHistory: async (req, res) => {
    try {
      const userId = req.user.id;
      if (!userId) {
        return res.status(400).json({ message: 'ID de usuário é necessário' });
      }
      
      const userHistory = await ProductSearchService.getUserOrderHistory(userId);
      if (!userHistory.success) {
        return res.status(404).json({ message: userHistory.message });
      }
      
      res.json(userHistory);
    } catch (error) {
      logAI('Erro ao buscar histórico para IA:', error);
      res.status(500).json({ message: 'Erro ao processar requisição' });
    }
  },
  
  /**
   * Obtém estatísticas de compra de um usuário para uso pela IA
   */
  getUserPurchaseStats: async (req, res) => {
    try {
      const userId = req.user.id;
      if (!userId) {
        return res.status(400).json({ message: 'ID de usuário é necessário' });
      }
      
      const stats = await ProductSearchService.getUserPurchaseStats(userId);
      if (!stats.success) {
        return res.status(404).json({ message: stats.message });
      }
      
      res.json(stats);
    } catch (error) {
      logAI('Erro ao buscar estatísticas para IA:', error);
      res.status(500).json({ message: 'Erro ao processar requisição' });
    }
  },
  
  /**
   * Integra dados de usuário para enriquecimento das respostas da IA
   */
  enrichUserContext: async (req, res) => {
    try {
      const userId = req.user.id;
      const { messageText } = req.body;
      
      if (!userId || !messageText) {
        return res.status(400).json({ message: 'Parâmetros incompletos' });
      }
      
      // Preparamos um objeto com contexto enriquecido para a IA
      const enrichedContext = {
        user: {
          id: userId,
          name: req.user.name
        },
        orderHistory: null,
        purchaseStats: null,
        relatedProducts: []
      };
      
      // Se parece uma pergunta sobre pedidos, buscamos o histórico
      if (messageText.toLowerCase().includes('pedido') || 
          messageText.toLowerCase().includes('compra') ||
          messageText.toLowerCase().includes('comprei')) {
        const history = await ProductSearchService.getUserOrderHistory(userId);
        if (history.success) {
          enrichedContext.orderHistory = history.orders;
        }
        
        const stats = await ProductSearchService.getUserPurchaseStats(userId);
        if (stats.success) {
          enrichedContext.purchaseStats = stats.stats;
        }
      }
      
      // Buscamos produtos relacionados à pergunta
      const relatedProducts = await ProductSearchService.findRelatedProducts(messageText);
      if (relatedProducts && relatedProducts.length > 0) {
        enrichedContext.relatedProducts = relatedProducts;
      }
      
      res.json({
        success: true,
        context: enrichedContext
      });
    } catch (error) {
      logAI('Erro ao enriquecer contexto do usuário:', error);
      res.status(500).json({ message: 'Erro ao processar contexto do usuário' });
    }
  }
};

export default AIController;
