import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_MODELS, AI_CONFIG, GENERATION_CONFIG, logAI, isValidApiKey } from '../config/aiConfig.js';
import { createProductAssistantPrompt, FALLBACK_RESPONSES, TEST_PROMPT, isAddToCartCommand } from '../config/prompts.js';
import ProductSearchService from './ProductSearchService.js';

// Mapa de conexões de usuários
const connections = new Map();
// Mapa de histórico de mensagens por sessão
const sessionMessages = new Map();
// Cache para evitar duplicação de mensagens
const processedMessages = new Set();

// Configuração do Gemini
let genAI;
let geminiModel;
let isGeminiAvailable = false;
let currentModelName = 'unknown';

// Inicializa o modelo Gemini
const initializeGemini = async () => {
  try {
    // Validação da API key
    if (!process.env.GEMINI_API_KEY) {
      logAI('GEMINI_API_KEY não definida no arquivo .env');
      return false;
    }
    
    if (!isValidApiKey(process.env.GEMINI_API_KEY)) {
      logAI('GEMINI_API_KEY possui formato inválido ou é um placeholder');
      return false;
    }
    
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Tenta cada modelo em ordem até encontrar um que funcione
    let modelWorking = false;
    
    for (const modelName of AI_MODELS) {
      try {
        logAI(`Tentando inicializar modelo: ${modelName}`);
        geminiModel = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            temperature: parseFloat(process.env.AI_TEMPERATURE || GENERATION_CONFIG.temperature),
            topP: GENERATION_CONFIG.topP,
            topK: GENERATION_CONFIG.topK,
          }
        });
        
        // Testa se o modelo realmente funciona
        const result = await geminiModel.generateContent(TEST_PROMPT);
        const responseText = result.response.text();
        logAI(`Modelo ${modelName} funcionando! Resposta: "${responseText.substring(0, 20)}..."`);
        
        // Se chegou aqui, o modelo funciona
        modelWorking = true;
        currentModelName = modelName;
        break;
      } catch (modelError) {
        logAI(`Erro ao testar modelo ${modelName}`, modelError);
      }
    }
    
    if (!modelWorking) {
      logAI('Nenhum modelo disponível funcionou');
      isGeminiAvailable = false;
      return false;
    }
    
    logAI(`Modelo Gemini inicializado com sucesso: ${currentModelName}`);
    isGeminiAvailable = true;
    return true;
  } catch (error) {
    logAI('Erro ao inicializar modelo Gemini', error);
    isGeminiAvailable = false;
    return false;
  }
};

// Tenta inicializar o modelo assim que o serviço for carregado
initializeGemini();

const aiService = {
  // Registra uma nova conexão WebSocket
  registerConnection: (userId, ws, sessionId) => {
    connections.set(userId, { ws, sessionId });
    
    // Inicializa histórico de sessão se necessário
    if (!sessionMessages.has(sessionId)) {
      sessionMessages.set(sessionId, []);
    }
    
    // Envia histórico de mensagens para o cliente
    const sessionHistory = sessionMessages.get(sessionId);
    if (sessionHistory && sessionHistory.length > 0) {
      ws.send(JSON.stringify({
        type: 'history',
        messages: sessionHistory
      }));
    }
    
    // Enviar status da API
    ws.send(JSON.stringify({
      type: 'api_status',
      available: isGeminiAvailable,
      model: currentModelName,
      message: isGeminiAvailable ? 
        `API Gemini conectada e funcionando com modelo: ${currentModelName}` : 
        'API Gemini não está disponível. O assistente responderá com mensagens padrão.'
    }));
    
    // Configura lógica para tratar mensagens recebidas
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Manipula diferentes tipos de mensagens
        if (data.type === 'chat') {
          // Gera um ID único para a mensagem
          const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          
          // Verifica se a mensagem já foi processada (evita duplicação)
          const messageFingerprint = `${sessionId}-${data.text}-${Date.now().toString().substring(0, 10)}`;
          if (processedMessages.has(messageFingerprint)) {
            logAI('Mensagem duplicada detectada e ignorada');
            return;
          }
          
          // Adiciona ao cache para evitar duplicação
          processedMessages.add(messageFingerprint);
          
          // Limpa mensagens antigas do cache periodicamente
          setTimeout(() => {
            processedMessages.delete(messageFingerprint);
          }, AI_CONFIG.cacheClearInterval);
          
          const userMessage = {
            id: messageId,
            userId: userId,
            userName: data.userName || 'Usuário',
            text: data.text,
            timestamp: new Date().toISOString()
          };
          
          // Salva a mensagem no histórico da sessão
          const history = sessionMessages.get(sessionId);
          history.push(userMessage);
          
          // Envia mensagem para todos na mesma sessão
          aiService.broadcastToSession(sessionId, {
            type: 'message',
            message: userMessage
          });
          
          // Processa a mensagem com a IA e envia resposta
          await aiService.processMessageWithAI(userMessage, sessionId);
        }
        else if (data.type === 'clear_history') {
          // Limpa histórico de mensagens da sessão
          if (sessionMessages.has(sessionId)) {
            sessionMessages.set(sessionId, []);
            
            // Notifica todos na sessão que o histórico foi limpo
            aiService.broadcastToSession(sessionId, {
              type: 'history',
              messages: []
            });
          }
        }
      } catch (error) {
        logAI('Erro ao processar mensagem WebSocket', error);
      }
    });
    
    // Lógica para quando a conexão for fechada
    ws.on('close', () => {
      connections.delete(userId);
      logAI(`Conexão websocket fechada: ${userId}`);
    });
  },
  
  // Envia mensagem para todos os usuários na mesma sessão
  broadcastToSession: (sessionId, message) => {
    connections.forEach((connection, userId) => {
      if (connection.sessionId === sessionId && connection.ws.readyState === 1) {
        connection.ws.send(JSON.stringify(message));
      }
    });
  },
  
  // Processa mensagem com o modelo de IA e envia resposta
  processMessageWithAI: async (userMessage, sessionId) => {
    try {
      let aiResponse;
      
      // Se a IA não está disponível, tenta inicializar novamente
      if (!isGeminiAvailable) {
        logAI("API não disponível, tentando inicializar novamente...");
        if (!await initializeGemini()) {
          logAI("Falhou ao reinicializar, usando resposta de fallback");
          throw new Error('API Gemini não está disponível');
        }
      }
      
      // Obtém o histórico da conversa
      const history = sessionMessages.get(sessionId) || [];
      const recentMessages = history
        .slice(-AI_CONFIG.contextMessageLimit)
        .filter(msg => msg.userId !== 'ai-assistant');
      
      const conversationContext = recentMessages
        .map(msg => `${msg.userName}: ${msg.text}`)
        .join('\n');
      
      // Verificar se é uma intenção de adicionar ao carrinho
      const isCartCommand = isAddToCartCommand(userMessage.text);
      if (isCartCommand) {
        logAI('Detectado comando de adicionar ao carrinho');
      }
      
      // Busca produtos relacionados à pergunta do usuário
      let relatedProducts = await ProductSearchService.findRelatedProducts(userMessage.text);
      
      // Se não encontrou produtos relacionados, busca alguns produtos aleatórios para sugerir
      if (relatedProducts.length === 0) {
        logAI("Nenhum produto relacionado encontrado, buscando produtos genéricos");
        relatedProducts = await ProductSearchService.findAllProducts(5);
      }
      
      // Para debugging
      if (relatedProducts.length > 0) {
        logAI(`Produtos disponíveis para sugestão: ${relatedProducts.map(p => p.name).join(', ')}`);
      } else {
        logAI("ALERTA: Nenhum produto disponível para oferecer ao usuário!");
      }
      
      try {
        if (isGeminiAvailable && geminiModel) {
          // Cria o prompt para a IA usando o template e incluindo os produtos
          const prompt = createProductAssistantPrompt(
            userMessage.text, 
            conversationContext,
            relatedProducts
          );
          
          logAI('Enviando prompt para o modelo Gemini com informações de produtos');
          
          // Gera a resposta da IA com timeout
          const result = await Promise.race([
            geminiModel.generateContent(prompt),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Tempo esgotado para resposta da API')), 
              AI_CONFIG.responseTimeout)
            )
          ]);
          
          logAI('Resposta recebida do modelo Gemini');
          const response = result.response;
          aiResponse = response.text();
          
          // Analisa a resposta para comandos de carrinho
          const processedResponse = parseCartCommands(aiResponse, relatedProducts);
          aiResponse = processedResponse;
        } else {
          throw new Error('Modelo Gemini não disponível');
        }
      } catch (apiError) {
        logAI('Erro ao chamar API Gemini', apiError);
        
        // Resposta personalizada com produtos encontrados
        if (relatedProducts.length > 0) {
          const productList = relatedProducts
            .map(p => `${p.name}: R$ ${p.price.toFixed(2)}`)
            .join(', ');
          
          aiResponse = `Encontrei estes produtos que podem te interessar: ${productList}. Posso ajudar com mais informações sobre algum deles?`;
        } else {
          // Respostas estáticas de fallback quando a API falha
          aiResponse = FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
        }
        
        // Tenta reiniciar o modelo em segundo plano
        setTimeout(() => {
          initializeGemini().then(success => {
            logAI(`Tentativa de reinicialização do modelo: ${success ? 'sucesso' : 'falha'}`);
          });
        }, AI_CONFIG.retry.initialDelay);
      }
      
      // Cria objeto de mensagem para a resposta da IA
      const aiMessage = {
        id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        userId: 'ai-assistant',
        userName: AI_CONFIG.assistantName,
        text: aiResponse,
        timestamp: new Date().toISOString()
      };
      
      // Salva a mensagem da IA no histórico
      history.push(aiMessage);
      
      // Envia a resposta da IA para todos na sessão
      aiService.broadcastToSession(sessionId, {
        type: 'message',
        message: aiMessage
      });
      
    } catch (error) {
      logAI('Erro ao processar mensagem com IA', error);
      
      // Envia mensagem de fallback como resposta
      const errorMessage = {
        id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        userId: 'ai-assistant',
        userName: AI_CONFIG.assistantName,
        text: 'Como posso ajudá-lo com suas compras hoje?',
        timestamp: new Date().toISOString()
      };
      
      // Adiciona ao histórico e envia para todos na sessão
      const history = sessionMessages.get(sessionId) || [];
      history.push(errorMessage);
      aiService.broadcastToSession(sessionId, {
        type: 'message',
        message: errorMessage
      });
    }
  }
};

// Função para processar comandos de carrinho na resposta da IA
function parseCartCommands(response, availableProducts) {
  // Verifica se a resposta contém comando de adicionar ao carrinho
  const cartCommandRegex = /\[ADICIONAR_AO_CARRINHO\]([0-9,]+)\s+(.*)/i;
  const match = response.match(cartCommandRegex);
  
  if (match) {
    logAI(`Comando de carrinho detectado! Texto original: "${response}"`);
    
    const productIds = match[1].split(',').map(id => id.trim());
    const messageText = match[2];
    
    logAI(`IDs de produtos extraídos: ${productIds.join(', ')}`);
    
    if (productIds.length === 0 || productIds[0] === '') {
      logAI('Comando de carrinho detectado, mas sem IDs de produto válidos');
      return response;
    }
    
    // Preparar informações dos produtos para enviar ao cliente
    const productsToAdd = [];
    
    for (const id of productIds) {
      // Busca pelo produto correspondente
      const product = availableProducts.find(p => p.id.toString() === id);
      
      if (product) {
        logAI(`Produto encontrado para ID ${id}: ${product.name}`);
        productsToAdd.push({
          id: product.id,
          name: product.name,
          price: product.price
        });
      } else {
        logAI(`ERRO: Produto com ID ${id} não encontrado na lista de ${availableProducts.length} produtos disponíveis`);
        logAI(`IDs disponíveis: ${availableProducts.map(p => p.id).join(', ')}`);
      }
    }
    
    if (productsToAdd.length === 0) {
      logAI('Nenhum produto válido para adicionar ao carrinho');
      return response; // Retorna a resposta original se não encontrou produtos
    }
    
    // Log dos produtos que serão adicionados
    logAI(`Adicionando ao carrinho ${productsToAdd.length} produto(s): ${productsToAdd.map(p => p.name).join(', ')}`);
    
    // Reformatar a mensagem para incluir metadados de produto
    return JSON.stringify({
      text: messageText,
      action: 'add_to_cart',
      products: productsToAdd
    });
  }
  
  return response;
}

export default aiService;
