interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
  action?: string;
  products?: any[];
  isSystemMessage?: boolean;
  showProductList?: boolean;
  productList?: any[];
}

export interface AIServiceEvents {
  onConnected: (userId: string, message: string) => void;
  onMessage: (message: Message) => void;
  onHistory: (messages: Message[]) => void;
  onApiStatus: (available: boolean) => void;
  onConnectionClosed: (code: number) => void;
  onConnectionError: (error: any) => void;
}

export class AIService {
  private ws: WebSocket | null = null;
  private sessionId: string = '';
  private serverUrl: string = 'ws://192.168.0.105:3000';
  private events: AIServiceEvents;
  private userName: string;
  private authToken: string | null = null;

  constructor(userName: string, events: AIServiceEvents) {
    this.userName = userName;
    this.events = events;
    this.sessionId = Date.now().toString();
  }

  // Método para definir o token de autenticação
  public setAuthToken(token: string | null): void {
    this.authToken = token;
    console.log('Token de autenticação atualizado');
  }

  // Adicionando um método para atualizar o nome do usuário
  public updateUserName(userName: string): void {
    this.userName = userName;
    console.log('Nome do usuário atualizado no serviço AI:', userName);
  }

  public connect(): void {
    try {
      // Inclui o token na URL de conexão
      let socketUrl = `${this.serverUrl}?sessionId=${this.sessionId}`;
      if (this.authToken) {
        socketUrl += `&token=${encodeURIComponent(this.authToken)}`;
      }
      console.log(`Tentando conectar ao WebSocket...`);

      this.ws = new WebSocket(socketUrl);

      this.ws.onopen = () => {
        console.log('WebSocket conectado!');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'connected') {
            // Atualiza o nome do usuário se o servidor fornecer
            if (data.userName) {
              this.userName = data.userName;
              console.log('Nome do usuário recebido do servidor:', data.userName);
            }
            this.events.onConnected(data.userId, data.message);
          } 
          else if (data.type === 'user_info_update') {
            // Tratamento para atualizações de informações do usuário
            if (data.userName) {
              this.userName = data.userName;
              console.log('Nome do usuário atualizado pelo servidor:', data.userName);
            }
          }
          else if (data.type === 'message') {
            console.log('Mensagem recebida:', JSON.stringify(data.message));
            const processedMessage = this.processAIMessage(data.message);
            this.events.onMessage(processedMessage);
          } 
          else if (data.type === 'history') {
            const processedMessages = data.messages.map((m: Message) => this.processAIMessage(m));
            this.events.onHistory(processedMessages);
          }
          else if (data.type === 'api_status') {
            this.events.onApiStatus(data.available);
          }
        } catch (parseError) {
          console.error('Erro ao processar mensagem do servidor:', parseError);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`WebSocket desconectado (código: ${event.code})`);
        this.events.onConnectionClosed(event.code);
      };

      this.ws.onerror = (error) => {
        console.error('Erro no WebSocket:', error);
        this.events.onConnectionError(error);
      };
    } catch (error) {
      console.error('Falha ao conectar WebSocket:', error);
      this.events.onConnectionError(error);
    }
  }

  public disconnect(): void {
    if (this.ws) {
      try {
        this.ws.close();
        this.ws = null;
      } catch (error) {
        console.error('Erro ao desconectar WebSocket:', error);
      }
    }
  }

  public sendMessage(message: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      console.log('Enviando mensagem como:', this.userName); // Log para depuração
      
      const messageData = {
        type: 'chat',
        userName: this.userName,
        text: message.trim()
      };
      
      this.ws.send(JSON.stringify(messageData));
      return true;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return false;
    }
  }

  public startNewConversation(): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      this.ws.send(JSON.stringify({
        type: 'new_conversation',
        sessionId: this.sessionId
      }));
      return true;
    } catch (error) {
      console.error('Erro ao iniciar nova conversa:', error);
      return false;
    }
  }

  private processAIMessage(message: Message): Message {
    try {
      if (message.isSystemMessage) {
        return message;
      }
      
      if (typeof message.text === 'string' && message.text.startsWith('{')) {
        try {
          const data = JSON.parse(message.text);
          
          if (data.action === 'list_products' && Array.isArray(data.products)) {
            if (data.products.length > 0) {
              return {
                ...message,
                text: data.text || `Aqui estão os produtos que você solicitou:`,
                showProductList: true,
                productList: data.products
              };
            }
          }
          
          if (data.action === 'show_cart') {
            return {
              ...message,
              text: data.text || `Aqui está seu carrinho:`,
              action: 'show_cart'
            };
          }
          
          if (data.action === 'add_to_cart' && data.productId) {
            return {
              ...message,
              text: data.text || `Produto adicionado ao carrinho.`,
              action: 'add_to_cart',
              productId: data.productId
            };
          }
          
          if (data.action === 'remove_from_cart' && data.productId) {
            return {
              ...message,
              text: data.text || `Produto removido do carrinho.`,
              action: 'remove_from_cart',
              productId: data.productId
            };
          }
          
          if (data.action === 'clear_cart') {
            return {
              ...message,
              text: data.text || `Seu carrinho foi esvaziado.`,
              action: 'clear_cart'
            };
          }
          
        } catch (jsonError) {
          console.error('Falha ao processar JSON da mensagem:', jsonError);
        }
      }
      
      return message;
    } catch (e) {
      console.log('Erro ao processar mensagem:', e);
      return message;
    }
  }
}

// Função utilitária para decodificar Base64
export const decodeJWT = (token: string): any => {
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Token JWT inválido');
    }
    
    const payload = JSON.parse(atob(tokenParts[1]));
    return payload;
  } catch (error) {
    console.error('Erro ao decodificar token JWT:', error);
    return null;
  }
};

const atob = (input: string) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = input.replace(/=+$/, '');
  let output = '';
  
  for (let bc = 0, bs = 0, buffer, i = 0;
      buffer = str.charAt(i++);
      ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
          bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
  ) {
    buffer = chars.indexOf(buffer);
  }
  
  return decodeURIComponent(escape(output));
};
