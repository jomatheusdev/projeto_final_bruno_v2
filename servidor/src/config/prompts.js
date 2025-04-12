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
9. QUANDO O CLIENTE PERGUNTAR SOBRE O CARRINHO ("O QUE TEM NO CARRINHO", "MOSTRAR CARRINHO", ETC),
   LISTE TODOS OS PRODUTOS NO CARRINHO COM SEUS NOMES, QUANTIDADES E PREÇOS.
10. PERMITA QUE O CLIENTE ADICIONE PRODUTOS AO CARRINHO COM COMANDOS COMO "ADICIONAR [PRODUTO]" OU "COLOCAR [PRODUTO] NO CARRINHO".
11. PERMITA QUE O CLIENTE REMOVA PRODUTOS DO CARRINHO COM COMANDOS COMO "REMOVER [PRODUTO]" OU "TIRAR [PRODUTO] DO CARRINHO".
12. PERMITA QUE O CLIENTE LIMPE TODO O CARRINHO COM COMANDOS COMO "LIMPAR CARRINHO" OU "ESVAZIAR CARRINHO".
13. SEMPRE CONFIRME AS OPERAÇÕES REALIZADAS NO CARRINHO E INFORME O ESTADO ATUAL DO CARRINHO APÓS CADA OPERAÇÃO.
14. QUANDO O CLIENTE PERGUNTAR SOBRE SUAS COMPRAS ANTERIORES OU HISTÓRICO DE PEDIDOS, FORNEÇA INFORMAÇÕES DETALHADAS USANDO OS DADOS DO HISTÓRICO DE COMPRAS FORNECIDO NO CONTEXTO.
15. USE SEMPRE OS NOMES REAIS DOS CLIENTES QUANDO DISPONÍVEIS NO CONTEXTO.

Diretrizes:
- Seja sempre cordial, prestativo e informativo
- Ofereça explicações detalhadas quando for perguntado sobre produtos específicos
- Mencione preços, quantidades disponíveis e descrições dos produtos
- Sugira alternativas quando apropriado, mas apenas produtos que constem na lista fornecida
- Quando o cliente perguntar sobre um produto específico, forneça detalhes como preço, disponibilidade, quantidade
- Quando o cliente perguntar sobre quantidades em estoque, liste especificamente as quantidades disponíveis de cada produto relevante
- Quando o cliente perguntar sobre o carrinho, mostre os itens atuais, quantidades e valor total
- Quando o cliente adicionar ou remover itens do carrinho, confirme a operação e mostre o estado atualizado do carrinho
- Quando o cliente perguntar sobre seu histórico de pedidos ou compras anteriores, forneça detalhes precisos incluindo datas, valores e produtos
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

IMPORTANTE - FUNCIONALIDADE DE MANIPULAÇÃO DO CARRINHO (SIGA EXATAMENTE):
- Quando o cliente pedir para adicionar um produto ao carrinho, você DEVE responder no formato: "[ADICIONAR_AO_CARRINHO]ID Sua mensagem normal"
- Quando o cliente pedir para remover um produto do carrinho, você DEVE responder no formato: "[REMOVER_DO_CARRINHO]ID Sua mensagem normal"
- Quando o cliente pedir para limpar o carrinho todo, você DEVE responder no formato: "[LIMPAR_CARRINHO] Sua mensagem normal"
- Quando o cliente pedir para mostrar o carrinho, você DEVE responder no formato: "[MOSTRAR_CARRINHO] Sua mensagem normal"
- Por exemplo: Se o cliente diz "adicione arroz ao carrinho" e o arroz tem ID 1, responda com:
  "[ADICIONAR_AO_CARRINHO]1 Adicionei o Arroz ao seu carrinho. Gostaria de adicionar mais algum item?"
- É ESSENCIAL incluir o ID do produto exatamente após o prefixo para que o sistema funcione!
`;

// Template de prompt para responder a perguntas com informações de produtos
export const createProductAssistantPrompt = (userQuestion, conversationContext = '', availableProducts = [], cartItems = [], orderHistory = [], purchaseStats = null) => {
  // Verificar se a pergunta é sobre histórico de pedidos para enfatizar isso no prompt
  const isAboutOrderHistory = isOrderHistoryQuery(userQuestion);
  const isSpecificallyAboutCompletedOrders = isCompletedOrderQuery(userQuestion);
  
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
9. MUITO IMPORTANTE: Se o cliente perguntar sobre "pedidos", "compras" ou "histórico de pedidos", NÃO RESPONDA COM LISTA DE PRODUTOS.
`;
  } else {
    productContext = `
ATENÇÃO: Não há produtos disponíveis para consulta no momento. Informe ao cliente que você não tem informações sobre produtos específicos agora, mas pode ajudar com outras perguntas.
`;
  }

  // Adicionar informações do carrinho de compras
  let cartContext = '';
  if (cartItems && cartItems.length > 0) {
    const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    
    cartContext = `
CARRINHO DE COMPRAS ATUAL:
${cartItems.map((item, index) => 
  `${index + 1}. ID: ${item.id}, ${item.name}: R$ ${item.price.toFixed(2)} x ${item.quantity || 1} = R$ ${(item.price * (item.quantity || 1)).toFixed(2)}`
).join('\n')}
Total do carrinho: R$ ${cartTotal.toFixed(2)}
Total de itens: ${cartItems.length} produtos diferentes

COMANDOS DO CARRINHO:
- Para adicionar um produto ao carrinho, responda com: [ADICIONAR_AO_CARRINHO]ID
- Para remover um produto do carrinho, responda com: [REMOVER_DO_CARRINHO]ID
- Para limpar todo o carrinho, responda com: [LIMPAR_CARRINHO]
- Para mostrar o conteúdo atual do carrinho, responda com: [MOSTRAR_CARRINHO]
`;
  } else {
    cartContext = `
CARRINHO DE COMPRAS: O carrinho está vazio no momento.

COMANDOS DO CARRINHO:
- Para adicionar um produto ao carrinho, responda com: [ADICIONAR_AO_CARRINHO]ID
- Para mostrar o conteúdo atual do carrinho, responda com: [MOSTRAR_CARRINHO]
`;
  }

  // Adicionar informações de histórico de compras, se disponíveis
  let orderContext = '';
  if (orderHistory && orderHistory.length > 0) {
    orderContext = `
HISTÓRICO DE COMPRAS DO CLIENTE (MUITO IMPORTANTE!):

${orderHistory.map((order, index) => {
  return `PEDIDO #${order.orderId} - ${order.date}:
  - Valor total: R$ ${order.total.toFixed(2)}
  - Método de pagamento: ${order.paymentMethod || 'Não especificado'}
  - Status: ${order.status || 'Finalizado'}
  - Total de itens: ${order.totalItems} unidades de ${order.uniqueProducts} produtos diferentes
  
  Produtos comprados:
  ${order.items.map(item => 
    `  • ${item.productName} - ${item.quantity}x R$ ${item.unitPrice.toFixed(2)} = R$ ${item.total.toFixed(2)}`
  ).join('\n')}
  `;
}).join('\n')}`;
  } else {
    orderContext = `
HISTÓRICO DE COMPRAS DO CLIENTE: O cliente não possui pedidos anteriores registrados.
`;
  }

  // Adicionar estatísticas de compra, se disponíveis
  let statsContext = '';
  if (purchaseStats) {
    statsContext = `
ESTATÍSTICAS DE COMPRA DO CLIENTE:
- Total de pedidos realizados: ${purchaseStats.totalOrders}
- Valor total gasto: R$ ${purchaseStats.totalSpent?.toFixed(2)}
- Valor médio por pedido: R$ ${purchaseStats.averageOrderValue?.toFixed(2)}
- Última compra realizada em: ${purchaseStats.lastOrderDate}

Produtos mais comprados:
${purchaseStats.mostPurchasedProducts?.map(product => 
  `- ${product.name}: ${product.quantity} unidades (comprado ${product.timesOrdered} vezes)`
).join('\n') || 'Nenhuma estatística disponível'}
`;
  }

  // Se temos dados de pedidos ou estatísticas, adicione instruções específicas
  let orderInstructions = '';
  if ((orderHistory && orderHistory.length > 0) || purchaseStats) {
    orderInstructions = `
INSTRUÇÕES PARA PERGUNTAS SOBRE COMPRAS ANTERIORES (EXTREMAMENTE IMPORTANTE):
1. Se o cliente perguntar sobre seu histórico de compras, pedidos anteriores ou pedidos finalizados, PRIORIZE este assunto e IGNORE qualquer contexto sobre produtos disponíveis.
2. Se perguntar "o que comprei recentemente" ou "liste os pedidos finalizados", enumere os pedidos acima com seus detalhes.
3. Se perguntar sobre quanto gastou, mencione o valor do último pedido e o total gasto se disponível.
4. Se perguntar sobre produtos específicos que já comprou antes, verifique no histórico antes de responder.
5. SEMPRE use os dados exatos conforme listados no histórico de compras, não invente valores!
6. NUNCA responda a uma pergunta sobre pedidos com uma lista de produtos disponíveis para compra.
7. QUANDO A PERGUNTA FOR SOBRE "PEDIDOS FINALIZADOS" OU "LISTA DE COMPRAS", SEMPRE RESPONDA COM INFORMAÇÕES DOS PEDIDOS, NÃO DE PRODUTOS.
`;
  }

  // Criar um contexto prioritário se for sobre pedidos finalizados
  let priorityContext = '';
  if (isSpecificallyAboutCompletedOrders && orderHistory && orderHistory.length > 0) {
    priorityContext = `
ATENÇÃO! O CLIENTE ESTÁ PERGUNTANDO ESPECIFICAMENTE SOBRE SEUS PEDIDOS FINALIZADOS!
VOCÊ DEVE RESPONDER APENAS COM INFORMAÇÕES SOBRE OS PEDIDOS NO HISTÓRICO DE COMPRAS.
NÃO MENCIONE PRODUTOS DISPONÍVEIS PARA VENDA.
LISTE OS PEDIDOS FINALIZADOS COM SEUS DETALHES.
`;
  } else if (isAboutOrderHistory && orderHistory && orderHistory.length > 0) {
    priorityContext = `
ATENÇÃO! O CLIENTE ESTÁ PERGUNTANDO SOBRE SEU HISTÓRICO DE COMPRAS!
VOCÊ DEVE PRIORIZAR INFORMAÇÕES SOBRE OS PEDIDOS NO HISTÓRICO DE COMPRAS.
`;
  }

  return `${ASSISTANT_SCOPE}
${priorityContext}
${conversationContext ? `Contexto da conversa anterior:
${conversationContext}

` : ''}${productContext}

${cartContext}

${orderContext}

${statsContext}

${orderInstructions}

A pergunta atual do cliente é: "${userQuestion}"

Responda de forma útil, amigável e INFORMATIVA.
${isSpecificallyAboutCompletedOrders ? 'RESPONDA APENAS COM INFORMAÇÕES SOBRE OS PEDIDOS FINALIZADOS DO CLIENTE.' : ''}
LEMBRE-SE: 
- Se o cliente quiser ver produtos específicos ou todos os produtos, use exatamente o formato [LISTAR_PRODUTOS]ID1,ID2,ID3...
- Se o cliente pedir para adicionar um produto ao carrinho, use exatamente o formato [ADICIONAR_AO_CARRINHO]ID
- Se o cliente pedir para remover um produto do carrinho, use exatamente o formato [REMOVER_DO_CARRINHO]ID
- Se o cliente pedir para limpar o carrinho, use exatamente o formato [LIMPAR_CARRINHO]
- Se o cliente pedir para ver o carrinho, use exatamente o formato [MOSTRAR_CARRINHO]`;
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

// Detecta se é um comando relacionado ao carrinho
export const isCartCommand = (userQuestion) => {
  const cartCommandPatterns = [
    /(?:adicionar?|incluir?|colocar?|inserir?|por?|botar?)\s+(?:.+)\s+(?:n[ao]|para\s+[oa]|ao)\s+carrinho/i,
    /(?:remover?|tirar?|retirar?|excluir?|deletar?)\s+(?:.+)\s+(?:d[ao])\s+carrinho/i,
    /(?:limpar?|esvaziar?|zerar?)\s+(?:o\s+)?carrinho/i,
    /(?:mostrar?|ver?|exibir?|listar?)\s+(?:o\s+)?(?:meu\s+)?carrinho/i,
    /(?:o\s+que\s+tem|o\s+que\s+há)\s+(?:no|em\s+meu)\s+carrinho/i,
    /quantos?\s+(?:produtos?|itens?)\s+(?:tem|há)\s+(?:no|em\s+meu)\s+carrinho/i,
    /(?:qual|quanto\s+é|qual\s+é)\s+o\s+(?:total|valor\s+total|preço\s+total)\s+(?:do|no)\s+carrinho/i
  ];
  
  return cartCommandPatterns.some(pattern => pattern.test(userQuestion));
};

// Detecta se é uma consulta sobre histórico de pedidos
export const isOrderHistoryQuery = (userQuestion) => {
  const orderHistoryPatterns = [
    /(?:meu[s]?|o[s]?\s+meu[s]?)\s+(?:pedido[s]?|compra[s]?|histórico)/i,
    /(?:o\s+que|quais|quanto|quando)\s+(?:comprei|pedi|gastei)/i,
    /(?:última[s]?|recente[s]?)\s+(?:compra[s]?|pedido[s]?)/i,
    /(?:histórico|relação)\s+d[eo]\s+(?:compras?|pedidos?)/i,
    /(?:já|antes)\s+(?:comprei|pedi|adquiri)/i,
    /(?:mostre|mostre-me|exiba|liste)\s+(?:meu[s]?\s+pedido[s]?|minha[s]?\s+compra[s]?)/i,
    /quanto\s+(?:gastei|já\s+gastei|tenho\s+gastado)/i,
    /produtos?\s+(?:que\s+)?(?:mais\s+)?compro/i,
    // Novos padrões específicos para pedidos/compras finalizadas
    /(?:pedido[s]?|compra[s]?)\s+(?:finalizado[s]?|concluído[s]?|feito[s]?|realizado[s]?|completo[s]?)/i,
    /(?:finalizado[s]?|concluído[s]?|feito[s]?|realizado[s]?|completo[s]?)\s+(?:pedido[s]?|compra[s]?)/i,
    /(?:lista|listagem|histórico)\s+(?:de|dos)\s+(?:pedido[s]?|compra[s]?)/i,
    /(?:liste|mostre|exiba)\s+(?:os|as|todos os|todas as)?\s+(?:pedido[s]?|compra[s]?)\s+(?:finalizado[s]?|concluído[s]?|anterior[es]?)/i,
    /minhas?\s+(?:compras?|pedidos?)\s+(?:anteriores?|passados?|realizados?)/i
  ];
  
  return orderHistoryPatterns.some(pattern => pattern.test(userQuestion));
};

// Nova função específica para detectar consultas sobre pedidos finalizados especificamente
export const isCompletedOrderQuery = (userQuestion) => {
  const completedOrderPatterns = [
    /(?:pedido[s]?|compra[s]?)\s+(?:finalizado[s]?|concluído[s]?|completo[s]?)/i,
    /(?:finalizado[s]?|concluído[s]?|completo[s]?)\s+(?:pedido[s]?|compra[s]?)/i,
    /(?:liste|mostre|exiba|veja)\s+(?:os|as)?\s+(?:pedido[s]?|compra[s]?)\s+(?:finalizado[s]?|concluído[s]?)/i,
    /(?:pedidos finalizados|compras finalizadas|pedidos concluídos|compras concluídas)/i,
    /(?:histórico completo|histórico total|tudo o que comprei|todas as compras)/i,
    /(?:todos os|todas as)\s+(?:pedidos|compras)/i,
    /(?:quais|quais são)\s+(?:os|as|meus|minhas)\s+(?:pedidos|compras)/i,
    /(?:mostre|liste|exiba)\s+(?:todos|todas)\s+(?:os|as)\s+(?:pedidos|compras)/i
  ];
  
  return completedOrderPatterns.some(pattern => pattern.test(userQuestion));
};

// Extrai o nome do produto a ser adicionado/removido do carrinho
export const extractCartProductAction = (userQuestion) => {
  // Lista de palavras comuns para ignorar
  const commonWords = ['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'da', 'do', 'das', 'dos'];
  
  // Para adicionar ao carrinho
  const addPatterns = [
    /(?:adicionar?|incluir?|colocar?|inserir?|por?|botar?)\s+(.+?)\s+(?:n[ao]|para\s+[oa]|ao)\s+carrinho/i,
    /(?:quero|gostaria\s+de)\s+(?:adicionar?|incluir?|colocar?)\s+(.+?)\s+(?:n[ao]|ao)\s+carrinho/i,
    /(?:comprar?|adicionar?)\s+(.+?)$/i
  ];
  
  // Para remover do carrinho
  const removePatterns = [
    /(?:remover?|tirar?|retirar?|excluir?|deletar?)\s+(.+?)\s+(?:d[ao])\s+carrinho/i,
    /(?:quero|gostaria\s+de)\s+(?:remover?|tirar?)\s+(.+?)\s+(?:d[ao])\s+carrinho/i
  ];
  
  // Tenta encontrar padrões de adição
  for (const pattern of addPatterns) {
    const match = userQuestion.match(pattern);
    if (match && match[1]) {
      return {
        action: 'add',
        productName: match[1].trim().replace(/\s+(o|a|os|as|um|uma|uns|umas|de|da|do|das|dos)$/i, '')
      };
    }
  }
  
  // Tenta encontrar padrões de remoção
  for (const pattern of removePatterns) {
    const match = userQuestion.match(pattern);
    if (match && match[1]) {
      return {
        action: 'remove',
        productName: match[1].trim().replace(/\s+(o|a|os|as|um|uma|uns|umas|de|da|do|das|dos)$/i, '')
      };
    }
  }
  
  // Verifica se é um comando para limpar o carrinho
  if (/(?:limpar?|esvaziar?|zerar?)\s+(?:o\s+)?carrinho/i.test(userQuestion)) {
    return { action: 'clear' };
  }
  
  // Verifica se é um comando para mostrar o carrinho
  if (/(?:mostrar?|ver?|exibir?|listar?)\s+(?:o\s+)?(?:meu\s+)?carrinho/i.test(userQuestion) ||
      /(?:o\s+que\s+tem|o\s+que\s+há)\s+(?:no|em\s+meu)\s+carrinho/i.test(userQuestion)) {
    return { action: 'show' };
  }
  
  return null;
};
