/**
 * Serviço para busca de produtos relacionados a perguntas do usuário
 */
import { Op } from 'sequelize';
import Product from '../models/ProductModel.js';
import Order from '../models/OrderModel.js';
import OrderItem from '../models/OrderItemModel.js';
import { AI_CONFIG, logAI } from '../config/aiConfig.js';
import { extractProductQuery, isStockQuery } from '../config/prompts.js';

// Calcula a similaridade entre duas strings (algoritmo simples de similaridade)
const calculateSimilarity = (str1, str2) => {
  str1 = str1.toLowerCase();
  str2 = str2.toLowerCase();
  
  // Se uma string contém a outra, alta similaridade
  if (str1.includes(str2) || str2.includes(str1)) {
    return 0.8;
  }
  
  // Contagem de palavras em comum
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));
  
  const commonWords = [...words1].filter(word => words2.has(word)).length;
  const totalWords = words1.size + words2.size - commonWords;
  
  return commonWords / totalWords;
};

// Avalia a relevância entre a consulta e um produto
const evaluateRelevance = (query, product) => {
  // Combina nome e descrição para avaliação
  const nameRelevance = calculateSimilarity(query, product.name);
  
  // Se houver descrição, considera na avaliação
  let descRelevance = 0;
  if (product.description) {
    descRelevance = calculateSimilarity(query, product.description) * 0.5; // Peso menor para descrição
  }
  
  return Math.max(nameRelevance, descRelevance);
};

const ProductSearchService = {
  // Busca todos os produtos disponíveis (usado para fallback)
  findAllProducts: async (limit = null) => {
    try {
      const options = {
        where: { quantity: { [Op.gt]: 0 } } // Apenas produtos com estoque
      };
      
      // Aplica limite apenas se especificado
      if (limit) {
        options.limit = limit;
      }
      
      const products = await Product.findAll(options);
      logAI(`Buscando todos os produtos${limit ? ' (limitado a ' + limit + ')' : ''}, encontrados: ${products.length}`);
      
      return products.map(p => p.get({ plain: true }));
    } catch (error) {
      logAI('Erro ao buscar todos os produtos:', error);
      return [];
    }
  },

  // Busca produtos relacionados a uma pergunta do usuário
  findRelatedProducts: async (userQuestion) => {
    try {
      // Verifica se a pergunta pede todos os produtos disponíveis
      const askingForAllProducts = /(?:quais|que|todos os|mostre os|liste os|ver|veja|ver todos|mostrar todos|mostrar|todos|todas as)?\s*(?:produtos|mercadorias|itens|opções)?\s*(?:disponíveis|cadastrados|temos|tem|há|existentes|em estoque|a venda|para comprar|que vocês vendem|que você vende|que temos|que tem)/i.test(userQuestion.toLowerCase());

      // Verifica se é uma pergunta sobre quantidade em estoque
      const isStockQuestion = isStockQuery(userQuestion);
      
      if (isStockQuestion) {
        logAI('Usuário perguntou sobre quantidade de estoque');
      }

      if (askingForAllProducts) {
        logAI('Usuário pediu para listar TODOS os produtos disponíveis');
        return await ProductSearchService.findAllProducts(); // Sem limite para retornar todos
      }
      
      // Lista de palavras-chave comuns para procurar
      const commonKeywords = [
        'ovo', 'ovos', 'carne', 'frango', 'leite', 'arroz', 
        'feijão', 'açúcar', 'café', 'pão', 'queijo', 'óleo',
        'macarrão', 'sal', 'farinha', 'molho', 'biscoito',
        'refrigerante', 'papel', 'sabonete', 'detergente'
      ];
      
      // Verifica se alguma palavra-chave aparece na pergunta
      const matchedKeywords = commonKeywords.filter(keyword => 
        userQuestion.toLowerCase().includes(keyword)
      );
      
      // Extrai possível consulta de produto
      const productQuery = extractProductQuery(userQuestion);
      
      // Se não encontrou termos para buscar, retorna alguns produtos populares
      if (!productQuery && matchedKeywords.length === 0) {
        logAI('Sem termos específicos de busca, retornando produtos populares');
        return await ProductSearchService.findAllProducts(5);
      }
      
      // Se parece uma pergunta sobre um produto específico (ex: "o que é arroz?")
      const isSpecificProductQuestion = /(?:o que é|me fale sobre|informações sobre|detalhes sobre|me explique|como é|descreva)\s+([^?.,!;]+)/i.test(userQuestion.toLowerCase());
      
      if (isSpecificProductQuestion) {
        logAI(`Detectada pergunta sobre produto específico: "${productQuery || matchedKeywords.join(', ')}"`);
      }
      
      logAI(`Buscando produtos relacionados a: "${productQuery || matchedKeywords.join(', ')}"`);
      
      // Monta a cláusula where para a busca
      let whereClause = { [Op.or]: [] };
      
      // Adiciona termos da consulta extraída
      if (productQuery) {
        whereClause[Op.or].push(
          { name: { [Op.like]: `%${productQuery}%` } },
          { description: { [Op.like]: `%${productQuery}%` } }
        );
      }
      
      // Adiciona palavras-chave encontradas
      matchedKeywords.forEach(keyword => {
        whereClause[Op.or].push(
          { name: { [Op.like]: `%${keyword}%` } },
          { description: { [Op.like]: `%${keyword}%` } }
        );
      });
      
      // Busca no banco de dados
      const products = await Product.findAll({
        where: whereClause,
        limit: 20 // Busca um número maior para filtrar por relevância depois
      });
      
      if (products.length === 0) {
        logAI('Nenhum produto encontrado para a consulta, retornando produtos populares');
        return await ProductSearchService.findAllProducts(5);
      }
      
      // Avalia a relevância de cada produto
      const relevantProducts = products
        .map(product => ({
          ...product.get({ plain: true }),
          relevance: evaluateRelevance(productQuery || matchedKeywords[0] || '', product)
        }))
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, isSpecificProductQuestion || isStockQuestion ? products.length : AI_CONFIG.productSearch.maxResults);
      
      logAI(`Encontrados ${relevantProducts.length} produtos relevantes`);
      return relevantProducts;
    } catch (error) {
      logAI('Erro ao buscar produtos relacionados', error);
      // Em caso de erro, tenta retornar alguns produtos
      return await ProductSearchService.findAllProducts(3);
    }
  },

  // Nova função para buscar um produto específico pelo ID
  findProductById: async (productId) => {
    try {
      const product = await Product.findByPk(productId);
      return product ? product.get({ plain: true }) : null;
    } catch (error) {
      logAI(`Erro ao buscar produto por ID ${productId}:`, error);
      return null;
    }
  },

  // Verificar disponibilidade de estoque para uma lista de produtos
  checkStockAvailability: async (productIds) => {
    try {
      if (!productIds || productIds.length === 0) {
        return { success: false, message: 'Nenhum produto especificado' };
      }
      
      const products = await Product.findAll({
        where: { id: { [Op.in]: productIds } }
      });
      
      if (products.length === 0) {
        return { 
          success: false, 
          message: 'Nenhum dos produtos solicitados foi encontrado' 
        };
      }
      
      const unavailableProducts = products.filter(p => p.quantity <= 0);
      
      if (unavailableProducts.length > 0) {
        return {
          success: false,
          message: 'Alguns produtos estão indisponíveis',
          unavailableProducts: unavailableProducts.map(p => ({
            id: p.id,
            name: p.name
          }))
        };
      }
      
      return {
        success: true,
        message: 'Todos os produtos estão disponíveis',
        products: products.map(p => p.get({ plain: true }))
      };
    } catch (error) {
      logAI('Erro ao verificar disponibilidade de produtos:', error);
      return { 
        success: false, 
        message: 'Erro ao verificar disponibilidade de produtos'
      };
    }
  },
  
  // Função para processar a finalização de uma compra
  finalizePurchase: async (productIds, quantities) => {
    try {
      // Verificações de parâmetros
      if (!productIds || productIds.length === 0) {
        return { success: false, message: 'Nenhum produto especificado para compra' };
      }
      
      if (!quantities || quantities.length !== productIds.length) {
        // Se quantidades não forem especificadas, assume 1 para cada produto
        quantities = productIds.map(() => 1);
      }
      
      // Primeiro verificamos a disponibilidade
      const stockCheck = await ProductSearchService.checkStockAvailability(productIds);
      
      if (!stockCheck.success) {
        return stockCheck;
      }
      
      // Processar a compra (reduzir o estoque)
      const productsForPurchase = stockCheck.products;
      const updatedProducts = [];
      let totalValue = 0;
      let totalItems = 0;
      
      for (let i = 0; i < productsForPurchase.length; i++) {
        const product = productsForPurchase[i];
        const requestedQuantity = quantities[i] || 1;
        
        if (product.quantity < requestedQuantity) {
          return {
            success: false,
            message: `Quantidade insuficiente para o produto: ${product.name}`,
            productId: product.id
          };
        }
        
        // Atualiza o estoque
        const newQuantity = product.quantity - requestedQuantity;
        await Product.update(
          { quantity: newQuantity },
          { where: { id: product.id } }
        );
        
        const subtotal = product.price * requestedQuantity;
        
        updatedProducts.push({
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: requestedQuantity,
          subtotal: subtotal,
          estoque_restante: newQuantity
        });
        
        totalValue += subtotal;
        totalItems += requestedQuantity;
      }
      
      return {
        success: true,
        message: 'Compra realizada com sucesso',
        purchaseDetails: {
          products: updatedProducts,
          totalValue: totalValue,
          totalItems: totalItems,
          uniqueProducts: updatedProducts.length,
          valorMedioItem: totalItems > 0 ? (totalValue / totalItems) : 0,
          purchaseDate: new Date().toISOString()
        }
      };
    } catch (error) {
      logAI('Erro ao finalizar compra:', error);
      return { success: false, message: 'Erro ao processar a compra' };
    }
  },

  // Busca histórico de compras de um usuário
  getUserOrderHistory: async (userId, limit = 5) => {
    try {
      if (!userId) {
        return { success: false, message: 'ID do usuário é obrigatório' };
      }

      const orders = await Order.findAll({
        where: { userId: userId },
        include: [
          {
            model: OrderItem,
            as: 'items',
            include: [{
              model: Product,
              attributes: ['name', 'price', 'imageUrl', 'description']
            }]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: limit
      });

      if (orders.length === 0) {
        return { 
          success: true, 
          message: 'Nenhuma compra encontrada para este usuário',
          orders: []
        };
      }

      // Formata os dados para um formato mais amigável para a IA
      const formattedOrders = orders.map(order => {
        const formattedDate = new Date(order.createdAt).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const items = order.items.map(item => ({
          productId: item.productId,
          productName: item.Product?.name || 'Produto não encontrado',
          quantity: item.quantity,
          unitPrice: parseFloat(item.price),
          total: parseFloat(item.price) * item.quantity
        }));

        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        const uniqueProducts = items.length;

        return {
          orderId: order.id,
          date: formattedDate,
          timestamp: order.createdAt,
          total: parseFloat(order.total),
          paymentMethod: order.paymentMethod,
          status: order.status,
          items: items,
          totalItems: totalItems,
          uniqueProducts: uniqueProducts
        };
      });

      logAI(`Histórico de compras recuperado para usuário ${userId}: ${formattedOrders.length} pedidos`);
      
      return {
        success: true,
        message: `${formattedOrders.length} compras encontradas`,
        orders: formattedOrders
      };
    } catch (error) {
      logAI(`Erro ao buscar histórico de compras para usuário ${userId}:`, error);
      return {
        success: false,
        message: 'Erro ao buscar histórico de compras'
      };
    }
  },

  // Busca todas as compras de um usuário sem limite de quantidade
  getAllUserOrders: async (userId) => {
    try {
      if (!userId) {
        return { success: false, message: 'ID do usuário é obrigatório' };
      }

      const orders = await Order.findAll({
        where: { userId: userId },
        include: [
          {
            model: OrderItem,
            as: 'items',
            include: [{
              model: Product,
              attributes: ['name', 'price', 'imageUrl', 'description']
            }]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      if (orders.length === 0) {
        return { 
          success: true, 
          message: 'Nenhuma compra encontrada para este usuário',
          orders: []
        };
      }

      // Formata os dados para um formato mais amigável para a IA
      const formattedOrders = orders.map(order => {
        const formattedDate = new Date(order.createdAt).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const items = order.items.map(item => ({
          productId: item.productId,
          productName: item.Product?.name || 'Produto não encontrado',
          quantity: item.quantity,
          unitPrice: parseFloat(item.price),
          total: parseFloat(item.price) * item.quantity
        }));

        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        const uniqueProducts = items.length;
        const totalValue = parseFloat(order.total);

        return {
          orderId: order.id,
          date: formattedDate,
          timestamp: order.createdAt,
          total: totalValue,
          formattedTotal: `R$ ${totalValue.toFixed(2)}`,
          paymentMethod: order.paymentMethod,
          status: order.status,
          statusFormatado: order.status === 'completed' ? 'Finalizado' : order.status,
          items: items,
          totalItems: totalItems,
          uniqueProducts: uniqueProducts,
          resumo: `Pedido #${order.id} - ${formattedDate} - ${totalItems} itens - R$ ${totalValue.toFixed(2)}`
        };
      });

      // Adiciona informações consolidadas úteis para a IA
      const totalGasto = formattedOrders.reduce((sum, order) => sum + order.total, 0);
      const totalPedidos = formattedOrders.length;
      const mediaGasto = totalGasto / totalPedidos;

      logAI(`Histórico completo de compras recuperado para usuário ${userId}: ${formattedOrders.length} pedidos`);
      
      return {
        success: true,
        message: `${formattedOrders.length} compras encontradas`,
        orders: formattedOrders,
        resumo: {
          totalPedidos,
          totalGasto: `R$ ${totalGasto.toFixed(2)}`,
          mediaGasto: `R$ ${mediaGasto.toFixed(2)}`,
          ultimaCompra: formattedOrders[0]?.resumo || 'Nenhuma compra'
        }
      };
    } catch (error) {
      logAI(`Erro ao buscar histórico completo de compras para usuário ${userId}:`, error);
      return {
        success: false,
        message: 'Erro ao buscar histórico de compras'
      };
    }
  },

  // Função específica para listar pedidos finalizados
  getCompletedOrders: async (userId) => {
    try {
      if (!userId) {
        return { success: false, message: 'ID do usuário é obrigatório' };
      }

      // Busca especificamente os pedidos com status "completed"
      const orders = await Order.findAll({
        where: { 
          userId: userId,
          status: 'completed'  // Filtra por status completed
        },
        include: [
          {
            model: OrderItem,
            as: 'items',
            include: [{
              model: Product,
              attributes: ['name', 'price', 'imageUrl', 'description']
            }]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      if (orders.length === 0) {
        return { 
          success: true, 
          message: 'Nenhum pedido finalizado encontrado',
          orders: []
        };
      }

      // Formata os dados para facilitar a apresentação pela IA
      const formattedOrders = orders.map(order => {
        const formattedDate = new Date(order.createdAt).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const items = order.items.map(item => ({
          productId: item.productId,
          productName: item.Product?.name || 'Produto não encontrado',
          quantity: item.quantity,
          unitPrice: parseFloat(item.price),
          total: parseFloat(item.price) * item.quantity
        }));

        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalValue = parseFloat(order.total);

        return {
          orderId: order.id,
          date: formattedDate,
          timestamp: order.createdAt,
          total: totalValue,
          formattedTotal: `R$ ${totalValue.toFixed(2)}`,
          paymentMethod: order.paymentMethod,
          status: 'Finalizado', // Em português para exibição
          items: items,
          totalItems: totalItems,
          uniqueProducts: items.length,
          resumo: `Pedido #${order.id} - ${formattedDate} - ${totalItems} itens - R$ ${totalValue.toFixed(2)}`
        };
      });

      logAI(`${formattedOrders.length} pedidos finalizados recuperados para usuário ${userId}`);
      
      return {
        success: true,
        message: `${formattedOrders.length} pedidos finalizados encontrados`,
        orders: formattedOrders
      };
    } catch (error) {
      logAI(`Erro ao buscar pedidos finalizados para usuário ${userId}:`, error);
      return {
        success: false,
        message: 'Erro ao buscar pedidos finalizados',
        error: error.message
      };
    }
  },

  // Obter detalhes específicos de um pedido
  getOrderDetails: async (orderId, userId) => {
    try {
      if (!orderId) {
        return { success: false, message: 'ID do pedido é obrigatório' };
      }

      const whereClause = { id: orderId };
      if (userId) {
        whereClause.userId = userId;
      }

      const order = await Order.findOne({
        where: whereClause,
        include: [
          {
            model: OrderItem,
            as: 'items',
            include: [{
              model: Product,
              attributes: ['id', 'name', 'price', 'description', 'imageUrl']
            }]
          }
        ]
      });

      if (!order) {
        return {
          success: false,
          message: 'Pedido não encontrado'
        };
      }

      // Formata os dados do pedido para facilitar o uso pela IA
      const formattedDate = new Date(order.createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const items = order.items.map(item => ({
        productId: item.productId,
        productName: item.Product?.name || 'Produto não encontrado',
        description: item.Product?.description || '',
        quantity: item.quantity,
        unitPrice: parseFloat(item.price),
        total: parseFloat(item.price) * item.quantity,
        imageUrl: item.Product?.imageUrl || null
      }));

      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
      
      const orderDetails = {
        orderId: order.id,
        date: formattedDate,
        timestamp: order.createdAt,
        total: parseFloat(order.total),
        paymentMethod: order.paymentMethod,
        status: order.status,
        items: items,
        totalItems: totalItems,
        uniqueProducts: items.length
      };

      logAI(`Detalhes do pedido ${orderId} recuperados com sucesso`);
      
      return {
        success: true,
        message: 'Detalhes do pedido recuperados com sucesso',
        order: orderDetails
      };
    } catch (error) {
      logAI(`Erro ao buscar detalhes do pedido ${orderId}:`, error);
      return {
        success: false,
        message: 'Erro ao buscar detalhes do pedido'
      };
    }
  },

  // Obter estatísticas de compra de um usuário
  getUserPurchaseStats: async (userId) => {
    try {
      if (!userId) {
        return { success: false, message: 'ID do usuário é obrigatório' };
      }

      // Todas as compras do usuário
      const orders = await Order.findAll({
        where: { userId: userId },
        include: [
          {
            model: OrderItem,
            as: 'items',
            include: [{
              model: Product,
              attributes: ['name', 'price', 'category']
            }]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      if (orders.length === 0) {
        return { 
          success: true, 
          message: 'Nenhuma compra encontrada para este usuário',
          stats: {
            totalOrders: 0,
            totalSpent: 0,
            averageOrderValue: 0
          }
        };
      }

      // Calcular estatísticas gerais
      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum, order) => sum + parseFloat(order.total), 0);
      const averageOrderValue = totalSpent / totalOrders;

      // Calcular produtos mais comprados
      const productFrequency = {};
      orders.forEach(order => {
        order.items.forEach(item => {
          const productName = item.Product?.name || `Produto ID ${item.productId}`;
          if (!productFrequency[productName]) {
            productFrequency[productName] = {
              quantity: 0,
              totalSpent: 0,
              timesOrdered: 0
            };
          }
          productFrequency[productName].quantity += item.quantity;
          productFrequency[productName].totalSpent += parseFloat(item.price) * item.quantity;
          productFrequency[productName].timesOrdered += 1;
        });
      });

      // Converter para array e ordenar por quantidade
      const mostPurchasedProducts = Object.entries(productFrequency)
        .map(([name, stats]) => ({
          name,
          quantity: stats.quantity,
          totalSpent: stats.totalSpent,
          timesOrdered: stats.timesOrdered
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5); // Top 5 produtos mais comprados

      // Informações da compra mais recente
      const lastOrder = orders[0];
      const lastOrderDate = new Date(lastOrder.createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      const stats = {
        totalOrders,
        totalSpent,
        averageOrderValue,
        mostPurchasedProducts,
        lastOrderDate,
        lastOrderId: lastOrder.id,
        lastOrderTotal: parseFloat(lastOrder.total)
      };

      logAI(`Estatísticas de compra recuperadas para usuário ${userId}`);
      
      return {
        success: true,
        message: 'Estatísticas de compra recuperadas com sucesso',
        stats
      };
    } catch (error) {
      logAI(`Erro ao buscar estatísticas de compra para usuário ${userId}:`, error);
      return {
        success: false,
        message: 'Erro ao buscar estatísticas de compra'
      };
    }
  }
};

export default ProductSearchService;
