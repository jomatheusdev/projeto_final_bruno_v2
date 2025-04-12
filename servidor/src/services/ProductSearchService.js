/**
 * Serviço para busca de produtos relacionados a perguntas do usuário
 */
import { Op } from 'sequelize';
import Product from '../models/ProductModel.js';
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
        await Product.update(
          { quantity: product.quantity - requestedQuantity },
          { where: { id: product.id } }
        );
        
        updatedProducts.push({
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: requestedQuantity,
          subtotal: product.price * requestedQuantity
        });
        
        totalValue += product.price * requestedQuantity;
      }
      
      return {
        success: true,
        message: 'Compra realizada com sucesso',
        purchaseDetails: {
          products: updatedProducts,
          totalValue: totalValue,
          purchaseDate: new Date().toISOString()
        }
      };
    } catch (error) {
      logAI('Erro ao finalizar compra:', error);
      return { success: false, message: 'Erro ao processar a compra' };
    }
  }
};

export default ProductSearchService;
