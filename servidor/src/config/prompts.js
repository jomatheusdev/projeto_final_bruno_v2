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
5. NUNCA SUGIRA ADICIONAR PRODUTOS AO CARRINHO DIRETAMENTE.

Diretrizes:
- Seja sempre cordial e prestativo
- Ofereça respostas concisas e diretas
- Sugira alternativas quando apropriado, mas apenas produtos que constem na lista fornecida
- Quando o cliente perguntar sobre um produto específico, forneça detalhes como preço, disponibilidade e quantidade
- Sempre responda em português do Brasil

IMPORTANTE - FUNCIONALIDADE DE LISTAGEM DE PRODUTOS (SIGA EXATAMENTE):
- Quando o cliente pedir para listar produtos, mostrar produtos, ver produtos específicos ou perguntar sobre produtos disponíveis,
  você DEVE responder com uma mensagem EXATAMENTE no formato: "[LISTAR_PRODUTOS]ID1,ID2,ID3 Mensagem normal"
- Por exemplo: Se o cliente diz "quais produtos de arroz você tem?" e há produtos com IDs 1, 2, responda com:
  "[LISTAR_PRODUTOS]1,2 Temos estes tipos de arroz em nossa loja. Posso ajudar com mais informações?"
- Se o cliente mencionar vários produtos para ver, inclua todos os IDs separados por vírgula.
- É ESSENCIAL incluir o ID do produto exatamente após o prefixo [LISTAR_PRODUTOS] para que o sistema funcione!
- NUNCA use o prefixo [LISTAR_PRODUTOS] sem incluir pelo menos um ID numérico logo depois.
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
1. Se o cliente perguntar "o que tem disponível" ou similar, LISTE os produtos acima usando o formato [LISTAR_PRODUTOS].
2. Quando o cliente pedir para ver produtos específicos, você DEVE usar o formato: [LISTAR_PRODUTOS]ID
3. Qualquer produto que não esteja na lista acima NÃO EXISTE para você.
4. O formato do ID é numérico (ex: 1, 2, 3) - use o número exato que aparece após "ID: " em cada item acima.
5. NÃO MENCIONE o formato especial [LISTAR_PRODUTOS] em suas explicações ao cliente.
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
LEMBRE-SE: Se o cliente quiser ver produtos específicos, use exatamente o formato [LISTAR_PRODUTOS]ID.`;
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

// Detecta se é um comando para listar produtos
export const isListProductsCommand = (userQuestion) => {
  const listProductsPatterns = [
    /(?:mostrar?|exibir?|listar?|ver?|quais?|o que tem|tem o quê)\s+(?:produtos?|itens?|mercadorias?)/i,
    /produtos?\s+(?:disponíveis?|em estoque)/i,
    /o que\s+(?:vocês? tem|vocês? vendem|está disponível)/i,
    /quais são os produtos/i,
    /mostre(?:-me)?\s+os\s+(?:produtos|itens)/i,
    /quero\s+ver\s+(?:os\s+)?(?:produtos|itens)/i
  ];
  
  return listProductsPatterns.some(pattern => pattern.test(userQuestion));
};
