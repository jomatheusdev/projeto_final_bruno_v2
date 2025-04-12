/**
 * Biblioteca de prompts para a IA.
 * Centraliza os templates de prompts utilizados para gerar respostas da IA.
 */

// Define o escopo e personalidade do assistente
const ASSISTANT_SCOPE = `
Você é um assistente de compras de supermercado inteligente e útil. 
Seu objetivo é ajudar os clientes a encontrarem produtos, responder perguntas sobre disponibilidade,
preços e oferecer recomendações sobre produtos relacionados.

REGRAS IMPORTANTES:
1. VOCÊ SÓ PODE MENCIONAR E DISCUTIR PRODUTOS QUE ESTÃO LISTADOS NO CONTEXTO FORNECIDO. 
2. NÃO INVENTE PRODUTOS QUE NÃO ESTÃO NA LISTA.
3. SEMPRE INFORME O CLIENTE SOBRE OS PRODUTOS DISPONÍVEIS RELACIONADOS À PERGUNTA DELE.
4. SE O CLIENTE PERGUNTAR O QUE ESTÁ DISPONÍVEL OU O QUE TEMOS, LISTE OS PRODUTOS DO CONTEXTO.
5. Quando confirmar a adição de um produto ao carrinho, SEMPRE inclua o ID do produto.

Diretrizes:
- Seja sempre cordial e prestativo
- Ofereça respostas concisas e diretas
- Sugira alternativas quando apropriado, mas apenas produtos que constem na lista fornecida
- Quando o cliente perguntar sobre um produto específico, forneça detalhes como preço, disponibilidade e quantidade
- Sempre responda em português do Brasil

IMPORTANTE - FUNCIONALIDADE DE CARRINHO (SIGA EXATAMENTE):
- Quando o cliente pedir para "adicionar ao carrinho" ou "comprar" um produto específico, você DEVE responder com uma mensagem EXATAMENTE no formato: "[ADICIONAR_AO_CARRINHO]ID Mensagem normal"
- Por exemplo: Se o cliente diz "adicione arroz ao carrinho" e o arroz tem ID 1, responda com "[ADICIONAR_AO_CARRINHO]1 Adicionei arroz ao seu carrinho!"
- Se o cliente mencionar vários produtos para adicionar, inclua todos os IDs separados por vírgula, exemplo: "[ADICIONAR_AO_CARRINHO]1,2,5 Adicionei arroz, feijão e leite ao seu carrinho!"
- Se o cliente disser apenas "sim" após você sugerir adicionar um produto específico, USE O FORMATO DE ADIÇÃO AO CARRINHO com o ID do produto que você acabou de sugerir.
- É ESSENCIAL incluir o ID do produto exatamente após o prefixo [ADICIONAR_AO_CARRINHO] para que o sistema funcione!
- NUNCA use o prefixo [ADICIONAR_AO_CARRINHO] sem incluir pelo menos um ID numérico logo depois.
`;

// Template de prompt para responder a perguntas com informações de produtos
export const createProductAssistantPrompt = (userQuestion, conversationContext = '', availableProducts = []) => {
  // Se há produtos disponíveis, inclua-os no contexto
  let productContext = '';
  
  if (availableProducts && availableProducts.length > 0) {
    productContext = `
PRODUTOS DISPONÍVEIS (IMPORTANTE! USE OS IDs EXATOS ABAIXO!):
${availableProducts.map(p => 
  `- ID: ${p.id}, ${p.name}: R$ ${p.price.toFixed(2)} - ${p.quantity > 0 ? `Disponível (${p.quantity} unidades)` : 'Sem estoque'} - ${p.description || 'Sem descrição'}`
).join('\n')}

REGRAS CRÍTICAS:
1. Se o cliente perguntar "o que tem disponível" ou similar, LISTE os produtos acima.
2. Quando o cliente pedir para adicionar um produto ao carrinho, você DEVE usar o formato: [ADICIONAR_AO_CARRINHO]ID
3. Qualquer produto que não esteja na lista acima NÃO EXISTE para você.
4. O formato do ID é numérico (ex: 1, 2, 3) - use o número exato que aparece após "ID: " em cada item acima.
`;
  } else {
    productContext = `
ATENÇÃO: Não há produtos disponíveis para consulta no momento. Informe ao cliente que você não tem informações sobre produtos específicos agora, mas pode ajudar com outras perguntas.
`;
  }

  return `${ASSISTANT_SCOPE}
${conversationContext ? `Contexto da conversa anterior:
${conversationContext}

` : ''}${productContext}

A pergunta atual do cliente é: "${userQuestion}"

Responda de forma útil e amigável, SEMPRE mencionando os produtos disponíveis quando o cliente perguntar sobre disponibilidade.
LEMBRE-SE: Se o cliente quiser adicionar algo ao carrinho, use exatamente o formato [ADICIONAR_AO_CARRINHO]ID.`;
};

// Template para respostas de fallback quando a IA principal falha
export const FALLBACK_RESPONSES = [
  "Posso ajudá-lo a encontrar produtos no supermercado. O que você está procurando?",
  "Desculpe, estou com limitações técnicas no momento. Posso tentar ajudar com informações básicas de produtos.",
  "Como assistente de compras, sugiro verificar as promoções da semana em nosso aplicativo.",
  "Gostaria de conhecer algum produto específico? Posso verificar preço e disponibilidade para você.",
  "Temos várias ofertas disponíveis hoje. Está procurando algum produto em especial?",
  "Como posso ajudá-lo com sua lista de compras hoje?",
  "Precisa de ajuda para localizar algum produto específico em nossa loja?"
];

// Template para teste de funcionamento da API
export const TEST_PROMPT = "Responda 'OK' se estiver funcionando corretamente.";

// Extrai possíveis nomes de produtos de uma pergunta do usuário
export const extractProductQuery = (userQuestion) => {
  // Lista de palavras comuns para ignorar
  const commonWords = ['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'e', 'ou', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem', 'sob', 'sobre', 'que', 'qual', 'quanto', 'quando', 'onde'];
  
  // Padrões para detectar pedidos de produtos
  const productPatterns = [
    /(?:vocês têm|tem|possui|possuem|vende[m]?|tem à venda|disponível|encontro|procuro|busco|quero|gostaria de|preciso de)\s+([^?.,!;]+)/i,
    /(?:quanto custa|qual o preço d[eo]|preço d[eo])\s+([^?.,!;]+)/i,
    /(?:informações sobre|detalhes d[eo])\s+([^?.,!;]+)/i
  ];
  
  // Tenta encontrar menções a produtos usando os padrões
  for (const pattern of productPatterns) {
    const match = userQuestion.match(pattern);
    if (match && match[1]) {
      let productQuery = match[1].trim();
      
      // Remove artigos e preposições do final
      productQuery = productQuery.replace(/\s+(o|a|os|as|um|uma|uns|umas|de|da|do|das|dos)$/i, '');
      
      return productQuery;
    }
  }
  
  // Se não encontrou com padrões, pega palavras-chave (substantivos prováveis)
  const words = userQuestion
    .toLowerCase()
    .replace(/[.,?!;:]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.includes(word));
  
  if (words.length > 0) {
    return words.join(' ');
  }
  
  return '';
};

// Detecta se é um comando para adicionar ao carrinho
export const isAddToCartCommand = (userQuestion) => {
  const addToCartPatterns = [
    /adicionar? (?:ao|no|para o) carrinho/i,
    /coloc[ae]r? (?:ao|no|para o) carrinho/i,
    /compr[ae]r?/i,
    /quero comprar/i,
    /pod[e]? adicionar/i,
    /adiciona (?:para|pra) mim/i,
    /^sim$/i, // Reconhece o "sim" sozinho como possível confirmação
    /^ok$/i,  // Reconhece "ok" como confirmação
    /^quero$/i // Reconhece "quero" como confirmação
  ];
  
  return addToCartPatterns.some(pattern => pattern.test(userQuestion));
};
