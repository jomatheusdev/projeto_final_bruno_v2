/**
 * Configuração centralizada para o serviço de IA.
 * Este arquivo contém as configurações e constantes utilizadas pelo serviço de IA.
 */

// Modelos de IA para tentar em ordem de preferência
export const AI_MODELS = [
  'gemini-1.5-flash', // Mais rápido, bom para respostas curtas
  'gemini-1.0-pro',   // Boa relação custo-benefício
  'gemini-pro',       // Modelo padrão
  'gemini-1.5-pro'    // Alta qualidade, mais lento
];

// Configurações gerais da IA
export const AI_CONFIG = {
  // Timeout para resposta da API em milissegundos
  responseTimeout: 15000,
  
  // Número máximo de mensagens a considerar no contexto da conversa
  contextMessageLimit: 6,
  
  // Intervalo para limpeza do cache em milissegundos
  cacheClearInterval: 60000,
  
  // Personalidade do assistente
  assistantName: 'Assistente IA',
  
  // Configurações de retry
  retry: {
    maxAttempts: 2,
    initialDelay: 1000
  },
  
  // Limites para busca de produtos
  productSearch: {
    maxResults: 5,
    searchThreshold: 0.3 // Limite de similaridade para busca de produtos
  }
};

// Configurações de geração de texto
export const GENERATION_CONFIG = {
  temperature: 0.7,
  topP: 0.8,
  topK: 40
};

// Log de eventos da IA - utilitário para registro consistente
export const logAI = (message, error = null) => {
  const timestamp = new Date().toISOString();
  const prefix = '[AI Service]';
  
  if (error) {
    console.error(`${prefix} [${timestamp}] ERROR: ${message}`, error);
  } else {
    console.log(`${prefix} [${timestamp}] ${message}`);
  }
};

// Valida formato da chave de API (verificação básica)
export const isValidApiKey = (key) => {
  return typeof key === 'string' && 
         key.length > 20 && 
         key !== 'sua_chave_api_gemini_aqui' &&
         !key.includes('PLACEHOLDER');
};
