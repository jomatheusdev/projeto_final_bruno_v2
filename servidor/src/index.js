import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import { URL } from 'url'; // Importar URL para parsing
import jwt from 'jsonwebtoken';
import userRouter from './routers/UserRouters.js';
import productRouter from './routers/ProductRouters.js';
import paymentRouter from './routers/PaymentRouter.js';
import orderRouter from './routers/OrderRouters.js';
import aiRouter from './routers/AIRouters.js'; // Importação do novo roteador da IA
import sequelize from './config/db.js';
import aiService from './services/AiService.js';
import DatabaseSeedService from './services/DatabaseSeedService.js';

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api', userRouter);
app.use('/api', productRouter);
app.use('/api', paymentRouter);
app.use('/api', orderRouter);
app.use('/api', aiRouter); // Registro do novo roteador da IA

// Cria servidor HTTP a partir do app Express
const server = http.createServer(app);

// Criar servidor WebSocket
const wss = new WebSocketServer({ server });

// Lidar com conexões WebSocket
wss.on('connection', (ws, req) => {
  // Analisar a URL para obter sessionId e token
  let sessionId;
  let userId = null;
  let userName = 'Usuário';
  
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    sessionId = url.searchParams.get('sessionId') || Date.now().toString();
    
    // Extrair token de autenticação, se disponível
    const token = url.searchParams.get('token');
    if (token) {
      try {
        // Verificar e decodificar o token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.id) {
          userId = decoded.id.toString();
          // Tentar obter usuário do banco de dados (simplificado)
          const User = sequelize.models.User;
          User.findByPk(userId)
            .then(user => {
              if (user && user.name) {
                userName = user.name;
                console.log(`Usuário autenticado: ${userName} (ID: ${userId})`);
                // Atualizar o nome nas conexões existentes
                aiService.updateUserInfo(userId, userName);
              }
            })
            .catch(err => console.error('Erro ao buscar usuário:', err));
        }
      } catch (tokenError) {
        console.error('Erro ao validar token:', tokenError.message);
      }
    }
  } catch (error) {
    sessionId = Date.now().toString(); // Fallback
    console.error('Erro ao analisar URL WebSocket:', error);
  }
  
  // Gera ID único para esta conexão se não for autenticado
  const connectionId = userId || Math.random().toString(36).substring(2, 15);
  
  console.log(`Nova conexão WebSocket: ${connectionId}, sessão: ${sessionId}, nome: ${userName}`);
  
  // Registra a conexão no serviço AI com o sessionId e userName
  aiService.registerConnection(connectionId, ws, sessionId, userName);
  
  // Envia mensagem de confirmação para o cliente
  ws.send(JSON.stringify({
    type: 'connected',
    userId: connectionId,
    userName: userName,
    sessionId,
    message: 'Conectado com sucesso ao chat IA'
  }));
});

// Inicializa o banco de dados e popula com dados iniciais se necessário
const startServer = async () => {
  try {
    // Sincroniza os modelos com o banco de dados
    await sequelize.sync();
    console.log('Banco de dados sincronizado com Sequelize');
    
    // Executa o seed inicial do banco de dados
    await DatabaseSeedService.seedDatabase();
    
    const PORT = process.env.PORT;
    
    // Inicia o servidor HTTP (que inclui Express e WebSocket)
    server.listen(PORT, () => {
      console.log(`Servidor rodando na porta http://localhost:${PORT}`);
      console.log(`WebSocket disponível em ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Erro ao inicializar servidor:', error);
  }
};

// Inicia o servidor
startServer();
