import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_MODELS, AI_CONFIG, GENERATION_CONFIG, logAI, isValidApiKey } from '../config/aiConfig.js';
import { createProductAssistantPrompt, FALLBACK_RESPONSES, TEST_PROMPT, isListProductsCommand, isCartCommand, isOrderHistoryQuery, isCompletedOrderQuery } from '../config/prompts.js';
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
  registerConnection: (userId, ws, sessionId, userName = 'Usuário') => {
    connections.set(userId, { ws, sessionId, userName });
    
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
      userName: userName, // Adiciona nome do usuário na resposta
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
        else if (data.type === 'new_conversation') {
          // Inicia uma nova conversa
          aiService.startNewConversation(data.sessionId || sessionId);
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
  
  // Atualiza informações do usuário para conexões existentes
  updateUserInfo: (userId, userName) => {
    const connection = connections.get(userId);
    if (connection) {
      connection.userName = userName;
      logAI(`Atualizado nome de usuário para conexão ${userId}: ${userName}`);
      
      // Notifica o cliente sobre a atualização do nome de usuário
      if (connection.ws.readyState === 1) {
        connection.ws.send(JSON.stringify({
          type: 'user_info_update',
          userName: userName
        }));
      }
    }
  },
  
  // Envia mensagem para todos os usuários na mesma sessão
  broadcastToSession: (sessionId, message) => {
    connections.forEach((connection, userId) => {
      if (connection.sessionId === sessionId && connection.ws.readyState === 1) {
        connection.ws.send(JSON.stringify(message));
      }
    });
  },
  
  // Inicia uma nova conversa
  startNewConversation: (sessionId) => {
    if (sessionMessages.has(sessionId)) {
      // Preserva o histórico antigo para referência, mas marca o início de uma nova conversa
      const history = sessionMessages.get(sessionId) || [];
      
      // Adiciona mensagem de sistema indicando início de nova conversa
      const systemMessage = {
        id: `system-${Date.now()}`,
        userId: 'system',
        userName: 'Sistema',
        text: '--- Nova conversa iniciada ---',
        timestamp: new Date().toISOString(),
        isSystemMessage: true
      };
      
      // Adiciona mensagem de boas-vindas do assistente
      const welcomeMessage = {
        id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        userId: 'ai-assistant',
        userName: AI_CONFIG.assistantName,
        text: 'Olá! Como posso ajudá-lo com suas compras hoje?',
        timestamp: new Date().toISOString()
      };
      
      // Adiciona as mensagens ao histórico
      history.push(systemMessage);
      history.push(welcomeMessage);
      
      // Notifica todos os clientes na sessão
      aiService.broadcastToSession(sessionId, {
        type: 'message',
        message: systemMessage
      });
      
      aiService.broadcastToSession(sessionId, {
        type: 'message',
        message: welcomeMessage
      });
    }
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
        .filter(msg => msg.userId !== 'ai-assistant' && !msg.isSystemMessage);
      
      const conversationContext = recentMessages
        .map(msg => `${msg.userName}: ${msg.text}`)
        .join('\n');
      
      // Garante que o nome do usuário está sendo usado corretamente
      const connection = Array.from(connections.values())
        .find(conn => conn.sessionId === sessionId && conn.ws.readyState === 1);
      
      if (connection && connection.userName) {
        userMessage.userName = connection.userName;
      }
      
      // Verificar se é uma pergunta sobre pedidos/histórico de compras
      const isOrderQuery = isOrderHistoryQuery(userMessage.text);
      const isCompletedOrder = isCompletedOrderQuery(userMessage.text);
      
      // Log para depuração
      if (isOrderQuery) {
        logAI(`Detectada consulta sobre histórico de pedidos (completos: ${isCompletedOrder})`);
      }
      
      // Busca informações de pedidos do usuário se a pergunta for relacionada a compras
      let userOrderHistory = null;
      let purchaseStats = null;
      let completedOrders = null;
      
      // Obter dados de pedidos primeiro se for uma consulta sobre pedidos
      if (isOrderQuery && userMessage.userId !== 'system') {
        try {
          // Tentamos buscar o histórico de compras do usuário
          const userId = userMessage.userId || 1; // Usando 1 como fallback para testes
          
          logAI(`Buscando histórico de pedidos para usuário: ${userId}`);
          
          // Se é especificamente sobre pedidos finalizados, usamos a função específica
          if (isCompletedOrder) {
            logAI(`Buscando pedidos finalizados para usuário: ${userId}`);
            completedOrders = await ProductSearchService.getCompletedOrders(userId);
            if (completedOrders && completedOrders.success) {
              userOrderHistory = completedOrders; // Usa os pedidos finalizados para exibição
              logAI(`Encontrados ${completedOrders.orders.length} pedidos finalizados`);
            }
          } else {
            // Caso contrário, busca o histórico normal
            userOrderHistory = await ProductSearchService.getUserOrderHistory(userId);
          }
          
          // Se conseguiu obter o histórico, também busca estatísticas de compra
          if (userOrderHistory && userOrderHistory.success) {
            purchaseStats = await ProductSearchService.getUserPurchaseStats(userId);
            logAI(`Estatísticas de compras recuperadas: ${purchaseStats.success}`);
          }
        } catch (orderError) {
          logAI('Erro ao buscar histórico de pedidos:', orderError);
        }
      }
      
      // Se for uma consulta de pedidos e tivermos dados, damos prioridade a isso
      // Só buscamos produtos em outras situações ou como fallback
      let relatedProducts = [];
      
      // Verificar se é uma intenção de listar produtos (apenas se não for uma consulta de pedidos)
      const isListCommand = isListProductsCommand(userMessage.text);
      
      if (!isOrderQuery || !userOrderHistory || !userOrderHistory.success) {
        // Verificamos se é uma intenção de listar produtos apenas se não for sobre pedidos
        // ou se não temos dados de pedidos
        if (isListCommand) {
          logAI('Detectado comando de listar produtos');
        }
        
        // Verificar se é uma intenção relacionada ao carrinho
        const isCartRelated = isCartCommand(userMessage.text);
        if (isCartRelated) {
          logAI('Detectado comando relacionado ao carrinho');
        }
        
        // Busca produtos relacionados à pergunta do usuário
        relatedProducts = await ProductSearchService.findRelatedProducts(userMessage.text);
        
        // Se não encontrou produtos relacionados, busca alguns produtos aleatórios para sugerir
        if (relatedProducts.length === 0) {
          logAI("Nenhum produto relacionado encontrado, buscando produtos genéricos");
          relatedProducts = await ProductSearchService.findAllProducts(5);
        }
      }
      
      try {
        if (isGeminiAvailable && geminiModel) {
          // Cria um prompt diferente dependendo do contexto da pergunta
          let prompt;
          
          if (isCompletedOrder && userOrderHistory && userOrderHistory.success) {
            // Para consultas específicas sobre pedidos concluídos, criamos um prompt que
            // enfatiza os dados de pedidos
            prompt = createProductAssistantPrompt(
              `Por favor, me mostre os detalhes dos meus pedidos finalizados. ${userMessage.text}`, 
              conversationContext,
              [], // Enviamos lista vazia de produtos para evitar distração
              [], // Carrinho vazio 
              userOrderHistory.orders || [],
              purchaseStats?.stats || null
            );
            logAI('Criando prompt com foco em pedidos finalizados');
          } else {
            // Prompt normal para outras perguntas
            prompt = createProductAssistantPrompt(
              userMessage.text, 
              conversationContext,
              relatedProducts,
              [], // Carrinho vazio por enquanto
              userOrderHistory?.orders || [],
              purchaseStats?.stats || null
            );
          }
          
          logAI('Enviando prompt para o modelo Gemini');
          
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
          
          // Analisa a resposta para comandos de listagem de produtos ou carrinho
          const processedResponse = parseAICommands(aiResponse, relatedProducts);
          aiResponse = processedResponse;
        } else {
          throw new Error('Modelo Gemini não disponível');
        }
      } catch (apiError) {
        logAI('Erro ao chamar API Gemini', apiError);
        
        // Se a pergunta era sobre histórico de pedidos e temos dados, gera uma resposta manual
        if (isOrderQuery && userOrderHistory && userOrderHistory.success) {
          if (isCompletedOrder && completedOrders && completedOrders.orders.length > 0) {
            // Resposta específica para pedidos finalizados
            const ordersCount = completedOrders.orders.length;
            const recentOrders = completedOrders.orders.slice(0, 3); // Mostra até 3 pedidos mais recentes
            
            aiResponse = `Você tem ${ordersCount} pedidos finalizados. Aqui estão os mais recentes:\n\n`;
            
            recentOrders.forEach(order => {
              aiResponse += `- Pedido #${order.orderId} (${order.date}): R$ ${order.total.toFixed(2)} - ${order.totalItems} itens\n`;
              
              // Adicionamos alguns produtos do pedido para detalhes adicionais
              if (order.items && order.items.length > 0) {
                const sampleItems = order.items.slice(0, 3); // Limitamos a 3 itens para não ficar muito extenso
                aiResponse += `   Inclui: ${sampleItems.map(item => `${item.quantity}x ${item.productName}`).join(', ')}${order.items.length > 3 ? '...' : ''}\n`;
              }
            });
            
            aiResponse += `\nGostaria de ver detalhes sobre algum pedido específico?`;
          } else if (userOrderHistory.orders.length > 0) {
            // Resposta para histórico geral de pedidos
            const lastOrder = userOrderHistory.orders[0];
            aiResponse = `De acordo com seu histórico, sua última compra foi feita em ${lastOrder.date} no valor total de R$ ${lastOrder.total.toFixed(2)} com ${lastOrder.totalItems} itens. Quer mais detalhes sobre esta compra?`;
          } else {
            aiResponse = "Você ainda não possui pedidos realizados.";
          }
        } 
        // Resposta personalizada com produtos encontrados
        else if (relatedProducts.length > 0) {
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

// Função para processar comandos na resposta da IA
function parseAICommands(response, availableProducts) {
  // Verifica se a resposta contém comando para listar produtos
  const listCommandRegex = /\[LISTAR_PRODUTOS\]([0-9,]+)\s+(.*)/i;
  const listMatch = response.match(listCommandRegex);
  
  if (listMatch) {
    logAI(`Comando de listagem de produtos detectado! Texto original: "${response}"`);
    
    const productIds = listMatch[1].split(',').map(id => id.trim());
    const messageText = listMatch[2];
    
    logAI(`IDs de produtos extraídos: ${productIds.join(', ')}`);
    
    if (productIds.length === 0 || productIds[0] === '') {
      logAI('Comando de listagem detectado, mas sem IDs de produto válidos');
      return response;
    }
    
    // Preparar informações dos produtos para enviar ao cliente
    const productsToList = [];
    
    for (const id of productIds) {
      // Busca pelo produto correspondente
      const product = availableProducts.find(p => p.id.toString() === id);
      
      if (product) {
        logAI(`Produto encontrado para ID ${id}: ${product.name}`);
        productsToList.push({
          id: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl || ''
        });
      } else {
        logAI(`ERRO: Produto com ID ${id} não encontrado na lista de ${availableProducts.length} produtos disponíveis`);
      }
    }
    
    if (productsToList.length === 0) {
      logAI('Nenhum produto válido para listar');
      return response; // Retorna a resposta original se não encontrou produtos
    }
    
    // Log dos produtos que serão listados
    logAI(`Listando ${productsToList.length} produto(s): ${productsToList.map(p => p.name).join(', ')}`);
    
    // Reformatar a mensagem para incluir metadados de produto
    return JSON.stringify({
      text: messageText,
      action: 'list_products',
      products: productsToList
    });
  }
  
  // Verificar comandos relacionados ao carrinho
  const cartCommandPatterns = {
    addToCart: /\[ADICIONAR_AO_CARRINHO\]([0-9]+)\s+(.*)/i,
    removeFromCart: /\[REMOVER_DO_CARRINHO\]([0-9]+)\s+(.*)/i,
    clearCart: /\[LIMPAR_CARRINHO\]\s+(.*)/i,
    showCart: /\[MOSTRAR_CARRINHO\]\s+(.*)/i
  };
  
  // Verificar comando para adicionar ao carrinho
  const addCartMatch = response.match(cartCommandPatterns.addToCart);
  if (addCartMatch) {
    const productId = addCartMatch[1];
    const messageText = addCartMatch[2];
    
    logAI(`Comando para adicionar produto ID ${productId} ao carrinho detectado`);
    
    return JSON.stringify({
      text: messageText,
      action: 'add_to_cart',
      productId: productId
    });
  }
  
  // Verificar comando para remover do carrinho
  const removeCartMatch = response.match(cartCommandPatterns.removeFromCart);
  if (removeCartMatch) {
    const productId = removeCartMatch[1];
    const messageText = removeCartMatch[2];
    
    logAI(`Comando para remover produto ID ${productId} do carrinho detectado`);
    
    return JSON.stringify({
      text: messageText,
      action: 'remove_from_cart',
      productId: productId
    });
  }
  
  // Verificar comando para limpar carrinho
  const clearCartMatch = response.match(cartCommandPatterns.clearCart);
  if (clearCartMatch) {
    const messageText = clearCartMatch[1];
    
    logAI('Comando para limpar carrinho detectado');
    
    return JSON.stringify({
      text: messageText,
      action: 'clear_cart'
    });
  }
  
  // Verificar comando para mostrar carrinho
  const showCartMatch = response.match(cartCommandPatterns.showCart);
  if (showCartMatch) {
    const messageText = showCartMatch[1];
    
    logAI('Comando para mostrar carrinho detectado');
    
    return JSON.stringify({
      text: "OK", // Simplificando a resposta para apenas "OK"
      action: 'show_cart'
    });
  }
  
  return response;
}

// Renomear a função existente parseProductListingCommand para usar a nova parseAICommands
const parseProductListingCommand = parseAICommands;

export default aiService;
