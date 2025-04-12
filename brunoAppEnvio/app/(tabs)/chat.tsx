import React, { useState, useEffect, useRef } from 'react';
import {
  FlatList,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ToastAndroid,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useCart } from '../../context/CartContext';

interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
  action?: string;
  products?: any[];
}

const Chat = () => {
  const { addProductsFromAI, addToCart } = useCart();
  const [userName, setUserName] = useState('Usuário');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState(Date.now().toString());
  const [isApiAvailable, setIsApiAvailable] = useState(true);
  const [lastSentMessage, setLastSentMessage] = useState('');
  const [lastSentTimestamp, setLastSentTimestamp] = useState(0);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const ws = useRef<WebSocket | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            const userId = payload.id;
            try {
              const SERVER_URL = 'http://192.168.0.105:3000';
              const response = await axios.get(`${SERVER_URL}/api/user/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              if (response.data && response.data.name) {
                setUserName(response.data.name);
              }
            } catch (fetchError) {
              console.error('Erro ao buscar dados do usuário:', fetchError);
              setUserName(`Usuário #${userId}`);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao recuperar dados do usuário:', error);
      } finally {
        // Inicia a primeira conexão
        connectWebSocket();
      }
    };

    getUserInfo();

    return () => {
      cleanupConnection();
    };
  }, []);

  // Limpa conexões e timers ao desmontar o componente
  const cleanupConnection = () => {
    if (ws.current) {
      ws.current.onclose = null; // Remove o handler de onclose para evitar tentativas de reconexão
      ws.current.close();
      ws.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  // Função para calcular delay de backoff exponencial
  const getReconnectDelay = () => {
    // Base de 2 segundos, dobra a cada tentativa até um máximo de 30 segundos
    const baseDelay = 2000;
    const maxDelay = 30000;
    const delay = Math.min(baseDelay * Math.pow(1.5, reconnectAttempts), maxDelay);
    return delay;
  };

  const connectWebSocket = () => {
    // Se já existe uma conexão ativa, limpe-a primeiro
    if (ws.current) {
      cleanupConnection();
    }
    
    setIsLoading(true);
    const newSessionId = Date.now().toString();
    setSessionId(newSessionId);
    
    const socketUrl = `ws://192.168.0.105:3000?sessionId=${newSessionId}`;
    
    try {
      console.log(`Tentando conectar ao WebSocket (tentativa ${reconnectAttempts + 1})...`);
      ws.current = new WebSocket(socketUrl);
      
      ws.current.onopen = () => {
        console.log('WebSocket conectado!');
        setIsConnected(true);
        setIsLoading(false);
        setReconnectAttempts(0); // Reseta o contador de tentativas após sucesso
      };
      
      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'connected') {
            setUserId(data.userId);
            // Exibe alerta apenas na primeira conexão ou após desconexão manual
            if (reconnectAttempts === 0) {
              Alert.alert('Conectado', data.message);
            }
          } 
          else if (data.type === 'message') {
            // Debug
            console.log('Mensagem recebida:', JSON.stringify(data.message));
            
            // Processa a mensagem antes de adicioná-la
            const processedMessage = processAIMessage(data.message);
            setMessages(prev => [...prev, processedMessage]);
            
            setTimeout(() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: true });
              }
            }, 100);
          } 
          else if (data.type === 'history') {
            // Processa mensagens do histórico
            const processedMessages = data.messages.map(processAIMessage);
            setMessages(processedMessages);
          }
          else if (data.type === 'api_status') {
            setIsApiAvailable(data.available);
            console.log(`Status da API: ${data.available ? 'Disponível' : 'Indisponível'}`);
            
            if (!data.available) {
              Alert.alert(
                'Aviso',
                'A API da IA não está configurada corretamente. As respostas serão limitadas.',
                [{ text: 'OK' }]
              );
            }
          }
        } catch (parseError) {
          console.error('Erro ao processar mensagem do servidor:', parseError);
        }
      };
      
      ws.current.onclose = (event) => {
        console.log(`WebSocket desconectado (código: ${event.code})`);
        setIsConnected(false);
        setIsLoading(false);
        
        // Implementa reconexão automática apenas se ativada
        if (autoReconnect) {
          // Limita o número máximo de tentativas consecutivas a 10
          if (reconnectAttempts < 10) {
            const reconnectDelay = getReconnectDelay();
            console.log(`Tentando reconectar em ${reconnectDelay / 1000} segundos...`);
            
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (autoReconnect) {
                setReconnectAttempts(prev => prev + 1);
                connectWebSocket();
              }
            }, reconnectDelay);
          } else {
            console.log('Número máximo de tentativas de reconexão atingido.');
            setAutoReconnect(false);
            Alert.alert(
              'Falha na Conexão',
              'Não foi possível restabelecer a conexão após várias tentativas. Por favor, tente reconectar manualmente mais tarde.',
              [{ text: 'OK' }]
            );
          }
        }
      };
      
      ws.current.onerror = (error) => {
        console.error('Erro no WebSocket:', error);
        setIsLoading(false);
      };
    } catch (error) {
      console.error('Falha ao conectar WebSocket:', error);
      setIsConnected(false);
      setIsLoading(false);
      Alert.alert('Erro', 'Não foi possível conectar ao servidor de chat');
    }
  };

  const disconnectWebSocket = () => {
    setAutoReconnect(false); // Desativa a reconexão automática
    
    if (ws.current) {
      try {
        ws.current.close();
        setIsConnected(false);
        Alert.alert('Desconectado', 'Você se desconectou do chat.');
      } catch (error) {
        console.error('Erro ao desconectar:', error);
        Alert.alert('Erro', 'Não foi possível desconectar corretamente.');
      }
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const manualReconnect = () => {
    setAutoReconnect(true);
    setReconnectAttempts(0);
    connectWebSocket();
  };

  const clearChat = () => {
    Alert.alert(
      "Limpar Chat",
      "Tem certeza que deseja limpar todo o histórico de conversa?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Limpar",
          style: "destructive",
          onPress: () => {
            setMessages([]);
            if (ws.current && isConnected) {
              try {
                ws.current.send(JSON.stringify({
                  type: 'clear_history',
                  sessionId: sessionId
                }));
              } catch (error) {
                console.error('Erro ao enviar comando de limpeza:', error);
              }
            }
          }
        }
      ]
    );
  };

  const handleSend = () => {
    if (!message.trim() || !isConnected || !ws.current) return;
    
    // Prevenir mensagens duplicadas (mesmo texto enviado em menos de 2 segundos)
    const now = Date.now();
    if (message.trim() === lastSentMessage && now - lastSentTimestamp < 2000) {
      console.log('Prevenindo envio de mensagem duplicada');
      setMessage('');
      return;
    }
    
    // Armazena mensagem e timestamp para prevenção de duplicatas
    setLastSentMessage(message.trim());
    setLastSentTimestamp(now);

    try {
      const messageData = {
        type: 'chat',
        userName,
        text: message.trim()
      };
      
      // Envie apenas, não adicione localmente - o servidor fará broadcast
      setMessage('');
      
      ws.current.send(JSON.stringify(messageData));
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      Alert.alert('Erro', 'Não foi possível enviar a mensagem');
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

  // Função para mostrar toast/alert
  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Notificação', message);
    }
  };
  
  // Função para processar mensagens especiais da IA
  const processAIMessage = (message: any) => {
    try {
      // Verifica se a mensagem é um JSON com comandos especiais
      if (typeof message.text === 'string' && message.text.startsWith('{')) {
        console.log('Detectada possível mensagem JSON da IA:', message.text);
        
        try {
          const data = JSON.parse(message.text);
          
          if (data.action === 'add_to_cart' && Array.isArray(data.products)) {
            console.log('Comando de adição ao carrinho detectado!');
            
            if (data.products.length > 0) {
              console.log('Produtos para adicionar:', JSON.stringify(data.products));
              
              // Adiciona os produtos ao carrinho
              addProductsFromAI(data.products);
              
              const productNames = data.products.map((p: any) => p.name).join(', ');
              showToast(`Adicionado ao carrinho: ${productNames}`);
              
              // Substitui o JSON por uma mensagem legível
              return {
                ...message,
                text: data.text || `Adicionei ${productNames} ao seu carrinho!`
              };
            } else {
              console.warn('Comando de carrinho sem produtos');
            }
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
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Conectando ao servidor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat com Assistente IA</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={clearChat}
          >
            <Ionicons name="trash-outline" size={20} color="white" />
          </TouchableOpacity>
          {isConnected ? (
            <TouchableOpacity 
              style={styles.disconnectButton}
              onPress={disconnectWebSocket}
            >
              <Text style={styles.disconnectButtonText}>Desconectar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.reconnectButton}
              onPress={manualReconnect}
            >
              <Text style={styles.reconnectText}>Reconectar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!isConnected && !isLoading && (
        <View style={styles.disconnectedBanner}>
          <Text style={styles.disconnectedText}>
            {reconnectAttempts > 0 
              ? `Desconectado: tentando reconexão (${reconnectAttempts}/10)...` 
              : 'Desconectado do servidor'}
          </Text>
          {reconnectAttempts > 0 && (
            <TouchableOpacity
              style={styles.cancelReconnectButton}
              onPress={() => setAutoReconnect(false)}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {isConnected && !isApiAvailable && (
        <View style={styles.apiBanner}>
          <Text style={styles.apiWarningText}>
            ⚠️ Serviço de IA com funcionamento limitado
          </Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        style={styles.flatList}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Balloon message={item} currentUserId={userId} />
        )}
        ListEmptyComponent={() => (
          <Text style={styles.emptyListText}>
            Nenhuma mensagem. Seja o primeiro a dizer olá!
          </Text>
        )}
        onContentSizeChange={() => {
          if (flatListRef.current && messages.length > 0) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }}
      />

      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Pergunte ao assistente IA..."
          value={message}
          onChangeText={setMessage}
          editable={isConnected}
        />
        <TouchableOpacity 
          style={[
            styles.sendButton, 
            !isConnected && styles.sendButtonDisabled
          ]} 
          onPress={handleSend}
          disabled={!isConnected}
        >
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const Balloon = ({
  message,
  currentUserId,
}: {
  message: Message;
  currentUserId: string | null;
}) => {
  const isAi = message.userId === 'ai-assistant';
  const isSelf = message.userId === currentUserId;
  
  const bubbleWrapper = isAi ? styles.bubbleWrapperAi : 
                      isSelf ? styles.bubbleWrapperSent : styles.bubbleWrapperReceived;
  
  const balloonColor = isAi ? styles.balloonAi : 
                      isSelf ? styles.balloonSent : styles.balloonReceived;
  
  const balloonTextColor = (isSelf || isAi) ? styles.balloonTextSent : styles.balloonTextReceived;

  return (
    <View style={[styles.bubbleWrapper, bubbleWrapper]}>
      <View style={[styles.balloon, balloonColor]}>
        <Text style={[styles.senderName, balloonTextColor]}>
          {message.userName}
        </Text>
        <Text style={[styles.balloonText, balloonTextColor]}>
          {message.text}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f1f1',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  disconnectedBanner: {
    backgroundColor: '#ffcccc',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  disconnectedText: {
    color: '#cc0000',
    flex: 1,
  },
  apiBanner: {
    backgroundColor: '#fff3cd',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  apiWarningText: {
    color: '#856404',
    fontWeight: 'bold',
  },
  reconnectButton: {
    backgroundColor: '#cc0000',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  reconnectText: {
    color: 'white',
    fontWeight: 'bold',
  },
  cancelReconnectButton: {
    backgroundColor: '#888',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
  },
  cancelText: {
    color: 'white',
    fontSize: 12,
  },
  flatList: {
    flex: 1,
    padding: 10,
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#999',
    fontStyle: 'italic',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 9,
    color: '#888',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  balloonSent: {
    backgroundColor: '#007bff',
  },
  balloonAi: {
    backgroundColor: '#8a2be2',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'white',
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: '#007bff',
    borderRadius: 20,
    padding: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  bubbleWrapper: { 
    flexDirection: 'row',
    marginBottom: 8,
  },
  bubbleWrapperSent: {
    alignSelf: 'flex-end',
    marginLeft: 40,
  },
  bubbleWrapperAi: {
    alignSelf: 'flex-start',
    marginRight: 40,
  },
  bubbleWrapperReceived: {
    alignSelf: 'flex-start',
    marginRight: 40,
  },
  balloon: {
    padding: 10,
    borderRadius: 16,
    maxWidth: '80%',
    minWidth: 100,
    flexShrink: 1,
  },
  balloonReceived: {
    backgroundColor: '#e5e5ea',
  },
  balloonText: {
    fontSize: 16,
  },
  balloonTextSent: {
    color: 'white',
  },
  balloonTextReceived: {
    color: 'black',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  disconnectButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  disconnectButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default Chat;
