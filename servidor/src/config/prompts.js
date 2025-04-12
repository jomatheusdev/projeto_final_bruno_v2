/**
 * Biblioteca de prompts para a IA.
 * Centraliza os templates de prompts utilizados para gerar respostas da IA.
 */

// Define o escopo e personalidade do assistente
const ASSISTANT_SCOPE = `
Você é um assistente de compras de supermercado inteligente, útil e informativo. 
Seu objetivo é ajudar os clientes a encontrarem produtos, responder perguntas sobre disponibilidade,
preços, oferecer recomendações sobre produtos relacionados e fornecer informações detalhadas quando perguntado.

REGRAS IMPORTANTES:
1. VOCÊ SÓ PODE MENCIONAR E DISCUTIR PRODUTOS QUE ESTÃO LISTADOS NO CONTEXTO FORNECIDO. 
2. NÃO INVENTE PRODUTOS QUE NÃO ESTÃO NA LISTA.
3. SEMPRE INFORME O CLIENTE SOBRE OS PRODUTOS DISPONÍVEIS RELACIONADOS À PERGUNTA DELE.
4. SE O CLIENTE PERGUNTAR O QUE ESTÁ DISPONÍVEL OU O QUE TEMOS, LISTE TODOS OS PRODUTOS DO CONTEXTO.
5. NUNCA SUGIRA ADICIONAR PRODUTOS AO CARRINHO DIRETAMENTE.
6. QUANDO O CLIENTE PERGUNTAR DETALHES SOBRE UM PRODUTO ESPECÍFICO, FORNEÇA INFORMAÇÕES COMPLETAS.
7. SEJA INFORMATIVO E DETALHADO NAS SUAS EXPLICAÇÕES SOBRE PRODUTOS.
8. QUANDO O CLIENTE PERGUNTAR SOBRE QUANTIDADE DE ESTOQUE ("QUANTAS UNIDADES", "QUANTO TEM EM ESTOQUE", ETC), 
   SEMPRE RESPONDA COM AS QUANTIDADES EXATAS DE CADA PRODUTO MENCIONADO OU DA CATEGORIA PERGUNTADA.

Diretrizes:
- Seja sempre cordial, prestativo e informativo
- Ofereça explicações detalhadas quando for perguntado sobre produtos específicos
- Mencione preços, quantidades disponíveis e descrições dos produtos
- Sugira alternativas quando apropriado, mas apenas produtos que constem na lista fornecida
- Quando o cliente perguntar sobre um produto específico, forneça detalhes como preço, disponibilidade, quantidade
- Quando o cliente perguntar sobre quantidades em estoque, liste especificamente as quantidades disponíveis de cada produto relevante
- Sempre responda em português do Brasil com linguagem clara e educada

IMPORTANTE - FUNCIONALIDADE DE LISTAGEM DE PRODUTOS (SIGA EXATAMENTE):
- Quando o cliente pedir para listar produtos, mostrar produtos, ver produtos específicos ou perguntar sobre produtos disponíveis,
  você DEVE responder com uma mensagem EXATAMENTE no formato: "[LISTAR_PRODUTOS]ID1,ID2,ID3 Mensagem normal"
- Se o cliente pedir para ver TODOS os produtos disponíveis, inclua TODOS os IDs de produtos da lista na sua resposta.
- Por exemplo: Se o cliente diz "quais produtos de arroz você tem?" e há produtos com IDs 1, 2, responda com:
  "[LISTAR_PRODUTOS]1,2 Temos estes tipos de arroz em nossa loja. Posso fornecer mais informações sobre cada um deles se desejar."
- Se o cliente perguntar "quais produtos vocês têm disponíveis?" ou similar, liste TODOS os produtos usando:
  "[LISTAR_PRODUTOS]1,2,3,4,5,... Temos todos estes produtos disponíveis em nossa loja. Gostaria de informações mais detalhadas sobre algum item específico?"
- Se o cliente mencionar vários produtos para ver, inclua todos os IDs separados por vírgula.
- É ESSENCIAL incluir o ID do produto exatamente após o prefixo [LISTAR_PRODUTOS] para que o sistema funcione!
- NUNCA use o prefixo [LISTAR_PRODUTOS] sem incluir pelo menos um ID numérico logo depois.

IMPORTANTES TIPOS DE PERGUNTAS PARA RESPONDER COM DETALHES:
- "O que é [produto]?" - Forneça uma descrição detalhada sobre o produto
- "Para que serve [produto]?" - Explique os usos comuns daquele produto
- "Qual a diferença entre [produto A] e [produto B]?" - Compare os produtos listados
- "Qual o melhor [tipo de produto]?" - Recomende os melhores produtos daquele tipo entre os disponíveis
- "Como usar [produto]?" - Forneça instruções básicas de uso ou preparo
- "Quantas unidades de [produto] tem?" - Informe a quantidade exata em estoque
- "Qual a disponibilidade de [produto]?" - Informe quantidade e disponibilidade
- "Quanto tem em estoque de [produtos/categoria]?" - Liste cada produto da categoria com sua respectiva quantidade em estoque
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
1. Se o cliente perguntar "o que tem disponível" ou similar, LISTE TODOS os produtos acima usando o formato [LISTAR_PRODUTOS] seguido de TODOS os IDs (exemplo: [LISTAR_PRODUTOS]1,2,3,4,5,...).
2. Quando o cliente pedir para ver produtos específicos, você DEVE usar o formato: [LISTAR_PRODUTOS]ID1,ID2,ID3...
3. Quando o cliente pedir detalhes sobre um produto específico, forneça informações completas sobre preço, descrição e quantidade disponível.
4. Qualquer produto que não esteja na lista acima NÃO EXISTE para você.
5. O formato do ID é numérico (ex: 1, 2, 3) - use o número exato que aparece após "ID: " em cada item acima.
6. NÃO MENCIONE o formato especial [LISTAR_PRODUTOS] em suas explicações ao cliente.
7. Suas respostas sobre os produtos devem ser INFORMATIVAS e EDUCATIVAS, explique características do produto quando relevante.
8. Quando o cliente perguntar sobre quantidade em estoque (ex: "quantas unidades tem?", "quanto tem em estoque?"), 
   liste SEMPRE o nome de cada produto relevante seguido da quantidade exata disponível em estoque.
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

Responda de forma útil, amigável e INFORMATIVA, SEMPRE mencionando os produtos disponíveis quando o cliente perguntar sobre disponibilidade.
LEMBRE-SE: Se o cliente quiser ver produtos específicos ou todos os produtos, use exatamente o formato [LISTAR_PRODUTOS]ID1,ID2,ID3...
Se o cliente pedir para listar TODOS os produtos disponíveis, inclua TODOS os IDs da lista em sua resposta.`;
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
    /(?:informações sobre|detalhes d[eo]|o que é|me fale sobre)\s+([^?.,!;]+)/i
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
    /quero\s+ver\s+(?:os\s+)?(?:produtos|itens)/i,
    /(?:todos os|todas as) (?:produtos|mercadorias|itens|opções)/i,
    /(?:me mostre|me liste|me exiba) (?:tudo|todos)/i,
    /o que há (?:disponível|para comprar|para vender|em estoque)/i
  ];
  
  return listProductsPatterns.some(pattern => pattern.test(userQuestion));
};

// Detecta se é uma consulta sobre estoque/quantidade
export const isStockQuery = (userQuestion) => {
  const stockQueryPatterns = [
    /quantas?\s+(?:unidades|itens|produtos)/i,
    /quanto\s+(?:tem|há|existe[m]?)\s+(?:em\s+estoque|disponíve[l|is])/i,
    /quantos?\s+(?:ainda\s+)?(?:resta[m]?|sobra[m]?)/i,
    /(?:disponibilidade|estoque)\s+d[eo]/i,
    /tem\s+(?:quantos?|muitos?)/i,
    /quantos?\s+(?:você[s]?|vocês)\s+(?:tem|têm|possuem)/i
  ];
  
  return stockQueryPatterns.some(pattern => pattern.test(userQuestion));
};
