import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import { URL } from 'url'; // Importar URL para parsing
import userRouter from './routers/UserRouters.js';
import productRouter from './routers/ProductRouters.js';
import paymentRouter from './routers/PaymentRouter.js';
import sequelize from './config/db.js';
import aiService from './services/AiService.js';

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api', userRouter);
app.use('/api', productRouter);
app.use('/api', paymentRouter); // Adicionando rota de pagamentos

// Cria servidor HTTP a partir do app Express
const server = http.createServer(app);

// Criar servidor WebSocket
const wss = new WebSocketServer({ server });

// Lidar com conexões WebSocket
wss.on('connection', (ws, req) => {
  // Analisar a URL para obter sessionId
  let sessionId;
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    sessionId = url.searchParams.get('sessionId') || Date.now().toString();
  } catch (error) {
    sessionId = Date.now().toString(); // Fallback
    console.error('Erro ao analisar URL WebSocket:', error);
  }
  
  // Gera ID único para esta conexão
  const userId = Math.random().toString(36).substring(2, 15);
  
  console.log(`Nova conexão WebSocket: ${userId}, sessão: ${sessionId}`);
  
  // Registra a conexão no serviço AI com o sessionId
  aiService.registerConnection(userId, ws, sessionId);
  
  // Envia mensagem de confirmação para o cliente
  ws.send(JSON.stringify({
    type: 'connected',
    userId,
    sessionId,
    message: 'Conectado com sucesso ao chat IA'
  }));
});

sequelize.sync()
  .then(() => {
    console.log('Banco de dados sincronizado com Sequelize');
    const PORT = process.env.PORT;
    
    // Inicia o servidor HTTP (que inclui Express e WebSocket)
    server.listen(PORT, () => {
      console.log(`Servidor rodando na porta http://localhost:${PORT}`);
      console.log(`WebSocket disponível em ws://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Erro ao sincronizar com o banco de dados:', error);
  });
