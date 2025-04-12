/**
 * Serviço para busca de produtos relacionados a perguntas do usuário
 */
import { Op } from 'sequelize';
import Product from '../models/ProductModel.js';
import { AI_CONFIG, logAI } from '../config/aiConfig.js';
import { extractProductQuery } from '../config/prompts.js';

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
  findAllProducts: async (limit = 10) => {
    try {
      const products = await Product.findAll({
        where: { quantity: { [Op.gt]: 0 } }, // Apenas produtos com estoque
        limit: limit
      });
      
      return products.map(p => p.get({ plain: true }));
    } catch (error) {
      logAI('Erro ao buscar todos os produtos:', error);
      return [];
    }
  },

  // Busca produtos relacionados a uma pergunta do usuário
  findRelatedProducts: async (userQuestion) => {
    try {
      // Lista de palavras-chave comuns para procurar
      const commonKeywords = [
        'ovo', 'ovos', 'carne', 'frango', 'leite', 'arroz', 
        'feijão', 'açúcar', 'café', 'pão', 'queijo'
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
        .slice(0, AI_CONFIG.productSearch.maxResults);
      
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
  }
};

export default ProductSearchService;
