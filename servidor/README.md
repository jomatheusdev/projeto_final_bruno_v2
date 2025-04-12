# Projeto Bruno v2 - Servidor

## Configuração do Sistema de IA

O projeto utiliza a API Google Gemini para fornecer assistência inteligente aos usuários. Para configurar:

1. **Obtenha uma API Key do Google Gemini**:
   - Acesse [Google AI Studio](https://makersuite.google.com/)
   - Crie uma conta ou faça login
   - Vá para a seção "API Keys" e crie uma nova chave
   - Copie a chave gerada

2. **Configure o arquivo .env**:
   ```
   GEMINI_API_KEY=sua_chave_api_aqui
   AI_TEMPERATURE=0.7  # Opcional - controla a criatividade das respostas (0.0-1.0)
   ```

3. **Modelos suportados**:
   O sistema tenta utilizar os seguintes modelos em ordem de preferência:
   - gemini-1.5-flash (mais rápido)
   - gemini-1.0-pro
   - gemini-pro
   - gemini-1.5-pro (maior qualidade)

## Estrutura da Integração com IA

- `config/aiConfig.js`: Configurações centralizadas para a IA
- `config/prompts.js`: Templates de prompts para comunicação com a IA
- `services/AiService.js`: Implementação do serviço de IA e WebSocket

## Executando o Servidor

```bash
npm install
npm run dev
```

O servidor estará disponível em http://localhost:3000 e o WebSocket em ws://localhost:3000.
