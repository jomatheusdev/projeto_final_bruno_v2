import { useState, useRef, useEffect } from 'react';
import { Alert, Platform, ToastAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { AIService, decodeJWT } from '../services/AIService';

interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
  action?: string;
  products?: any[];
  isSystemMessage?: boolean;
  productId?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  quantity?: number;
}

export const useAIChat = (addToCart: (product: Product) => void, removeFromCart: (id: string) => void, clearCart: () => void) => {
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
  const [productsToShow, setProductsToShow] = useState<Product[]>([]);
  const [showProductList, setShowProductList] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);

  const aiServiceRef = useRef<AIService | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Inicialização do chat
  useEffect(() => {
    getUserInfo();
    return () => cleanupConnection();
  }, []);

  // Carrega informações do usuário e inicializa a conexão
  const getUserInfo = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        const payload = decodeJWT(token);
        if (payload && payload.id) {
          const userId = payload.id;
          try {
            const SERVER_URL = 'http://192.168.0.105:3000';
            const response = await axios.get(`${SERVER_URL}/api/user/${userId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data && response.data.name) {
              const userName = response.data.name;
              setUserName(userName);
              console.log('Nome do usuário definido:', userName);
              
              // Importante: Criar serviço de AI após obter nome do usuário
              setupAIService(userName, token);
              
              // Se o serviço já existir, atualiza o nome do usuário
              if (aiServiceRef.current) {
                aiServiceRef.current.updateUserName(userName);
              }
            } else {
              setupAIService('Usuário', token);
            }
          } catch (fetchError) {
            console.error('Erro ao buscar dados do usuário:', fetchError);
            setUserName(`Usuário #${userId}`);
            setupAIService(`Usuário #${userId}`, token);
          }
        } else {
          setupAIService('Usuário', token);
        }
      } else {
        setupAIService('Usuário', null);
      }
    } catch (error) {
      console.error('Erro ao recuperar dados do usuário:', error);
      setupAIService('Usuário', null);
    }
  };
  
  // Configura e conecta o serviço de IA
  const setupAIService = (name: string, token: string | null) => {
    console.log(`Configurando serviço AI para usuário: ${name}`);
    
    const aiService = new AIService(name, {
      onConnected: (userId, message) => {
        setIsConnected(true);
        setIsLoading(false);
        setUserId(userId);
        if (reconnectAttempts === 0) {
          Alert.alert('Conectado', message);
        }
        setReconnectAttempts(0);
      },
      onMessage: (message) => {
        handleReceivedMessage(message);
      },
      onHistory: (messages) => {
        setMessages(messages);
      },
      onApiStatus: (available) => {
        setIsApiAvailable(available);
        if (!available) {
          Alert.alert(
            'Aviso',
            'A API da IA não está configurada corretamente. As respostas serão limitadas.',
            [{ text: 'OK' }]
          );
        }
      },
      onConnectionClosed: (code) => {
        setIsConnected(false);
        setIsLoading(false);
        
        if (autoReconnect) {
          if (reconnectAttempts < 10) {
            const reconnectDelay = getReconnectDelay();
            
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
            setAutoReconnect(false);
            Alert.alert(
              'Falha na Conexão',
              'Não foi possível restabelecer a conexão após várias tentativas. Por favor, tente reconectar manualmente mais tarde.',
              [{ text: 'OK' }]
            );
          }
        }
      },
      onConnectionError: (error) => {
        console.error('Erro na conexão WebSocket:', error);
        setIsConnected(false);
        setIsLoading(false);
      }
    });
    
    // Define o token de autenticação
    if (token) {
      aiService.setAuthToken(token);
    }
    
    aiServiceRef.current = aiService;
    aiService.connect();
  };

  // Controle de reconexão
  const getReconnectDelay = () => {
    const baseDelay = 2000;
    const maxDelay = 30000;
    const delay = Math.min(baseDelay * Math.pow(1.5, reconnectAttempts), maxDelay);
    return delay;
  };

  // Limpa a conexão e timers
  const cleanupConnection = () => {
    if (aiServiceRef.current) {
      aiServiceRef.current.disconnect();
      aiServiceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  // Inicia a conexão WebSocket
  const connectWebSocket = () => {
    setIsLoading(true);
    cleanupConnection();
    
    const newSessionId = Date.now().toString();
    setSessionId(newSessionId);
    
    console.log('Iniciando conexão WebSocket com nome:', userName);
    
    aiServiceRef.current = new AIService(userName, {
      onConnected: (userId, message) => {
        setIsConnected(true);
        setIsLoading(false);
        setUserId(userId);
        if (reconnectAttempts === 0) {
          Alert.alert('Conectado', message);
        }
        setReconnectAttempts(0);
      },
      onMessage: (message) => {
        handleReceivedMessage(message);
      },
      onHistory: (messages) => {
        setMessages(messages);
      },
      onApiStatus: (available) => {
        setIsApiAvailable(available);
        if (!available) {
          Alert.alert(
            'Aviso',
            'A API da IA não está configurada corretamente. As respostas serão limitadas.',
            [{ text: 'OK' }]
          );
        }
      },
      onConnectionClosed: (code) => {
        setIsConnected(false);
        setIsLoading(false);
        
        if (autoReconnect) {
          if (reconnectAttempts < 10) {
            const reconnectDelay = getReconnectDelay();
            
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
            setAutoReconnect(false);
            Alert.alert(
              'Falha na Conexão',
              'Não foi possível restabelecer a conexão após várias tentativas. Por favor, tente reconectar manualmente mais tarde.',
              [{ text: 'OK' }]
            );
          }
        }
      },
      onConnectionError: (error) => {
        console.error('Erro na conexão WebSocket:', error);
        setIsConnected(false);
        setIsLoading(false);
      }
    });
    
    aiServiceRef.current.connect();
  };

  // Processa mensagens recebidas
  const handleReceivedMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
    
    if (message.action === 'show_cart') {
      setShowCartModal(true);
    } 
    else if (message.action === 'add_to_cart' && message.productId) {
      handleAddToCartById(message.productId);
    } 
    else if (message.action === 'remove_from_cart' && message.productId) {
      removeFromCart(message.productId);
    } 
    else if (message.action === 'clear_cart') {
      clearCart();
    }
    else if (message.showProductList && message.productList) {
      setProductsToShow(message.productList);
      setShowProductList(true);
    }
    
    if (message.type === 'new_conversation') {
      setProductsToShow([]);
      setShowProductList(false);
      setShowCartModal(false);
    }
  };

  // Funções públicas do hook
  const manualReconnect = () => {
    setAutoReconnect(true);
    setReconnectAttempts(0);
    connectWebSocket();
  };

  const startNewConversation = () => {
    if (aiServiceRef.current && isConnected) {
      setMessages([]);
      const success = aiServiceRef.current.startNewConversation();
      if (success) {
        setProductsToShow([]);
        setShowProductList(false);
        setShowCartModal(false);
      } else {
        Alert.alert('Erro', 'Não foi possível iniciar uma nova conversa');
      }
    } else {
      Alert.alert('Erro', 'Você precisa estar conectado para iniciar uma nova conversa');
    }
  };

  const sendMessage = () => {
    if (!message.trim() || !isConnected || !aiServiceRef.current) return;
    
    const now = Date.now();
    if (message.trim() === lastSentMessage && now - lastSentTimestamp < 2000) {
      setMessage('');
      return;
    }
    
    setLastSentMessage(message.trim());
    setLastSentTimestamp(now);

    const success = aiServiceRef.current.sendMessage(message);
    if (success) {
      setMessage('');
    } else {
      Alert.alert('Erro', 'Não foi possível enviar a mensagem');
    }
  };

  // Função para mostrar notificações
  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Notificação', message);
    }
  };

  // Função para adicionar produto ao carrinho por ID
  const handleAddToCartById = async (productId: string) => {
    try {
      const SERVER_URL = 'http://192.168.0.105:3000';
      
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        showToast('Você precisa estar logado para adicionar produtos ao carrinho');
        return;
      }
      
      const response = await axios.get(`${SERVER_URL}/api/product/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        const product = response.data;
        addToCart(product);
        showToast(`${product.name} adicionado ao carrinho`);
      }
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      showToast('Não foi possível adicionar o produto ao carrinho');
    }
  };

  // Função para adicionar produto ao carrinho diretamente
  const handleAddToCart = (product: Product) => {
    addToCart(product);
    showToast(`${product.name} adicionado ao carrinho`);
  };

  return {
    // Estado
    userName,
    message,
    messages,
    isConnected,
    isLoading,
    userId,
    isApiAvailable,
    reconnectAttempts,
    autoReconnect,
    productsToShow,
    showProductList,
    showCartModal,
    
    // Setters
    setMessage,
    setAutoReconnect,
    setShowProductList,
    setShowCartModal,
    
    // Actions
    sendMessage,
    manualReconnect,
    startNewConversation,
    handleAddToCart,
    handleAddToCartById,
    showToast
  };
};
