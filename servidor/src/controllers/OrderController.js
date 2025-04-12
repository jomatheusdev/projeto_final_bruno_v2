import Order from '../models/OrderModel.js';
import OrderItem from '../models/OrderItemModel.js';
import Product from '../models/ProductModel.js';
import sequelize from '../config/db.js';

const orderController = {
  // Cria um novo pedido
  create: async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const { items, paymentMethod, total } = req.body;
      const userId = req.user.id;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Itens do pedido são obrigatórios' });
      }
      
      // Cria o pedido
      const order = await Order.create({
        userId,
        total,
        paymentMethod,
        status: 'completed'
      }, { transaction });
      
      // Cria os itens do pedido e atualiza estoque
      const orderItems = [];
      
      for (const item of items) {
        // Verifica se o produto existe e tem estoque
        const product = await Product.findByPk(item.id);
        if (!product) {
          await transaction.rollback();
          return res.status(404).json({ 
            message: `Produto não encontrado: ${item.id}`
          });
        }
        
        if (product.quantity < item.quantity) {
          await transaction.rollback();
          return res.status(400).json({ 
            message: `Estoque insuficiente para: ${product.name}` 
          });
        }
        
        // Cria o item do pedido
        const orderItem = await OrderItem.create({
          orderId: order.id,
          productId: item.id,
          quantity: item.quantity,
          price: item.price
        }, { transaction });
        
        orderItems.push(orderItem);
        
        // Atualiza o estoque do produto
        await Product.update(
          { quantity: product.quantity - item.quantity },
          { where: { id: item.id }, transaction }
        );
      }
      
      await transaction.commit();
      
      res.status(201).json({
        message: 'Compra realizada com sucesso',
        orderId: order.id,
        total: order.total
      });
      
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao processar compra:', error);
      res.status(500).json({ message: error.message });
    }
  },

  // Busca histórico de compras do usuário
  getUserOrders: async (req, res) => {
    try {
      const userId = req.user.id;
      
      const orders = await Order.findAll({
        where: { userId },
        include: [
          {
            model: OrderItem,
            as: 'items',
            include: [{
              model: Product,
              attributes: ['name', 'imageUrl']
            }]
          }
        ],
        order: [['createdAt', 'DESC']]
      });
      
      res.status(200).json(orders);
    } catch (error) {
      console.error('Erro ao buscar histórico de compras:', error);
      res.status(500).json({ message: error.message });
    }
  },

  // Busca detalhes de uma compra específica
  getOrderDetails: async (req, res) => {
    try {
      const orderId = req.params.id;
      const userId = req.user.id;
      
      const order = await Order.findOne({
        where: { id: orderId, userId },
        include: [
          {
            model: OrderItem,
            as: 'items',
            include: [{
              model: Product,
              attributes: ['id', 'name', 'imageUrl']
            }]
          }
        ]
      });
      
      if (!order) {
        return res.status(404).json({ message: 'Pedido não encontrado' });
      }
      
      res.status(200).json(order);
    } catch (error) {
      console.error('Erro ao buscar detalhes do pedido:', error);
      res.status(500).json({ message: error.message });
    }
  }
};

export default orderController;
