import { GoogleGenerativeAI } from '@google/generative-ai';

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

// Modelos para tentar em ordem de preferência
const MODELS_TO_TRY = [
  'gemini-1.5-flash',
  'gemini-1.0-pro',
  'gemini-pro',
  'gemini-1.5-pro'
];

// Inicializa o modelo Gemini
const initializeGemini = async () => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY não definida. O assistente AI não funcionará corretamente.');
      return false;
    }
    
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Tenta cada modelo em ordem até encontrar um que funcione
    let modelWorking = false;
    
    for (const modelName of MODELS_TO_TRY) {
      try {
        console.log(`Tentando inicializar modelo: ${modelName}`);
        geminiModel = genAI.getGenerativeModel({ model: modelName });
        
        // Testa se o modelo realmente funciona
        const result = await geminiModel.generateContent("Teste simples de funcionamento");
        const responseText = result.response.text();
        console.log(`Modelo ${modelName} funcionando! Resposta: "${responseText.substring(0, 20)}..."`);
        
        // Se chegou aqui, o modelo funciona
        modelWorking = true;
        break;
      } catch (modelError) {
        console.error(`Erro ao testar modelo ${modelName}:`, modelError.message);
      }
    }
    
    if (!modelWorking) {
      console.error('Nenhum modelo disponível funcionou');
      isGeminiAvailable = false;
      return false;
    }
    
    console.log(`Modelo Gemini inicializado com sucesso: ${geminiModel._modelName || 'desconhecido'}`);
    isGeminiAvailable = true;
    return true;
  } catch (error) {
    console.error('Erro ao inicializar modelo Gemini:', error);
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
      message: isGeminiAvailable ? 
        `API Gemini conectada e funcionando com modelo: ${geminiModel?._modelName || 'desconhecido'}` : 
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
            console.log('Mensagem duplicada detectada e ignorada');
            return;
          }
          
          // Adiciona ao cache para evitar duplicação
          processedMessages.add(messageFingerprint);
          
          // Limpa mensagens antigas do cache a cada 60 segundos
          setTimeout(() => {
            processedMessages.delete(messageFingerprint);
          }, 60000);
          
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
        console.error('Erro ao processar mensagem WebSocket:', error);
      }
    });
    
    // Lógica para quando a conexão for fechada
    ws.on('close', () => {
      connections.delete(userId);
      console.log(`Conexão websocket fechada: ${userId}`);
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
        console.log("API não disponível, tentando inicializar novamente...");
        if (!await initializeGemini()) {
          console.log("Falhou ao reinicializar, usando resposta de fallback");
          throw new Error('API Gemini não está disponível');
        }
      }
      
      // Obtém o histórico da conversa (últimas 6 mensagens)
      const history = sessionMessages.get(sessionId) || [];
      const recentMessages = history.slice(-6).filter(msg => msg.userId !== 'ai-assistant');
      const conversationContext = recentMessages.map(msg => msg.text).join('\n');
      
      try {
        if (isGeminiAvailable && geminiModel) {
          // Contexto para a IA - versão simplificada para maior compatibilidade
          const prompt = `Como assistente de compras para supermercado, responda à seguinte pergunta do cliente de forma útil e amigável: ${userMessage.text}`;
          
          console.log('Enviando prompt para o modelo Gemini...');
          
          // Gera a resposta da IA com timeout
          const result = await Promise.race([
            geminiModel.generateContent(prompt),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Tempo esgotado para resposta da API')), 15000)
            )
          ]);
          
          console.log('Resposta recebida do modelo Gemini');
          const response = result.response;
          aiResponse = response.text();
        } else {
          throw new Error('Modelo Gemini não disponível');
        }
      } catch (apiError) {
        console.error('Erro ao chamar API Gemini:', apiError);
        
        // Respostas estáticas de fallback quando a API falha
        const fallbackResponses = [
          "Posso ajudá-lo a encontrar produtos no supermercado. O que você está procurando?",
          "Desculpe, estou com limitações técnicas no momento. Posso tentar ajudar com informações básicas de produtos.",
          "Como assistente de compras, sugiro verificar as promoções da semana em nosso aplicativo.",
          "Obrigado por sua pergunta. Gostaria de saber mais sobre algum produto específico?",
          "Estamos com ofertas especiais em produtos de limpeza e alimentos não-perecíveis esta semana."
        ];
        
        aiResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      }
      
      // Cria objeto de mensagem para a resposta da IA
      const aiMessage = {
        id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        userId: 'ai-assistant',
        userName: 'Assistente IA',
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
      console.error('Erro ao processar mensagem com IA:', error);
      
      // Envia mensagem de fallback como resposta
      const errorMessage = {
        id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        userId: 'ai-assistant',
        userName: 'Assistente IA',
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

export default aiService;
