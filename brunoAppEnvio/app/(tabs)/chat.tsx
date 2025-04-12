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
  Modal,
  ScrollView,
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
  isSystemMessage?: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  quantity?: number;
}

const Chat = () => {
  const { addToCart, removeFromCart, clearCart, cartItems, totalValue } = useCart();
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
        connectWebSocket();
      }
    };

    getUserInfo();

    return () => {
      cleanupConnection();
    };
  }, []);

  const cleanupConnection = () => {
    if (ws.current) {
      ws.current.onclose = null;
      ws.current.close();
      ws.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const getReconnectDelay = () => {
    const baseDelay = 2000;
    const maxDelay = 30000;
    const delay = Math.min(baseDelay * Math.pow(1.5, reconnectAttempts), maxDelay);
    return delay;
  };

  const connectWebSocket = () => {
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
        setReconnectAttempts(0);
      };
      
      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'connected') {
            setUserId(data.userId);
            if (reconnectAttempts === 0) {
              Alert.alert('Conectado', data.message);
            }
          } 
          else if (data.type === 'message') {
            console.log('Mensagem recebida:', JSON.stringify(data.message));
            const processedMessage = processAIMessage(data.message);
            setMessages(prev => [...prev, processedMessage]);
            
            setTimeout(() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: true });
              }
            }, 100);
          } 
          else if (data.type === 'history') {
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
        
        if (autoReconnect) {
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
    setAutoReconnect(false);
    
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

  const startNewConversation = () => {
    console.log('Função startNewConversation chamada');
    if (ws.current && isConnected) {
      try {
        console.log('WebSocket está conectado, enviando comando para o servidor');
        // Limpa as mensagens existentes antes de iniciar nova conversa
        setMessages([]);
        ws.current.send(JSON.stringify({
          type: 'new_conversation',
          sessionId: sessionId
        }));
        console.log('Comando enviado com sucesso:', { type: 'new_conversation', sessionId });
        setProductsToShow([]);
        setShowProductList(false);
        setShowCartModal(false);
      } catch (error) {
        console.error('Erro ao enviar comando de nova conversa:', error);
        Alert.alert('Erro', 'Não foi possível iniciar uma nova conversa');
      }
    } else {
      console.log('WebSocket não está conectado:', { wsExists: !!ws.current, isConnected });
      Alert.alert('Erro', 'Você precisa estar conectado para iniciar uma nova conversa');
    }
  };

  const handleSend = () => {
    if (!message.trim() || !isConnected || !ws.current) return;
    
    const now = Date.now();
    if (message.trim() === lastSentMessage && now - lastSentTimestamp < 2000) {
      console.log('Prevenindo envio de mensagem duplicada');
      setMessage('');
      return;
    }
    
    setLastSentMessage(message.trim());
    setLastSentTimestamp(now);

    try {
      const messageData = {
        type: 'chat',
        userName,
        text: message.trim()
      };
      
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

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Notificação', message);
    }
  };
  
  const processAIMessage = (message: any) => {
    try {
      if (message.isSystemMessage) {
        return message;
      }
      
      if (typeof message.text === 'string' && message.text.startsWith('{')) {
        console.log('Detectada possível mensagem JSON da IA:', message.text);
        
        try {
          const data = JSON.parse(message.text);
          
          if (data.action === 'list_products' && Array.isArray(data.products)) {
            console.log('Comando de listagem de produtos detectado!');
            
            if (data.products.length > 0) {
              setProductsToShow(data.products);
              setShowProductList(true);
              
              console.log('Produtos para mostrar:', JSON.stringify(data.products));
              
              return {
                ...message,
                text: data.text || `Aqui estão os produtos que você solicitou:`,
                showProductList: true,
                productList: data.products
              };
            } else {
              console.warn('Comando de listagem sem produtos');
            }
          }
          
          if (data.action === 'show_cart') {
            console.log('Comando de mostrar carrinho detectado!');
            setShowCartModal(true);
            
            return {
              ...message,
              text: data.text || `Aqui está seu carrinho:`,
              action: 'show_cart'
            };
          }
          
          if (data.action === 'add_to_cart' && data.productId) {
            console.log('Comando para adicionar item ao carrinho detectado!');
            
            handleAddToCartById(data.productId);
            
            return {
              ...message,
              text: data.text || `Produto adicionado ao carrinho.`,
              action: 'add_to_cart'
            };
          }
          
          if (data.action === 'remove_from_cart' && data.productId) {
            console.log('Comando para remover item do carrinho detectado!');
            
            removeFromCart(data.productId);
            
            return {
              ...message,
              text: data.text || `Produto removido do carrinho.`,
              action: 'remove_from_cart'
            };
          }
          
          if (data.action === 'clear_cart') {
            console.log('Comando para limpar carrinho detectado!');
            
            clearCart();
            
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
      
      if (message.type === 'new_conversation') {
        setProductsToShow([]);
        setShowProductList(false);
        setShowCartModal(false);
      }
      
      return message;
    } catch (e) {
      console.log('Erro ao processar mensagem:', e);
      return message;
    }
  };

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

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    showToast(`${product.name} adicionado ao carrinho`);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Conectando ao servidor...</Text>
      </View>
    );
  }

  const renderCartModal = () => {
    return (
      <Modal
        visible={showCartModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCartModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.cartModalContent}>
            <View style={styles.cartModalHeader}>
              <Text style={styles.cartModalTitle}>Seu Carrinho</Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setShowCartModal(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {cartItems.length === 0 ? (
              <View style={styles.emptyCartMessage}>
                <Ionicons name="cart-outline" size={48} color="#ccc" />
                <Text style={styles.emptyCartText}>Seu carrinho está vazio</Text>
              </View>
            ) : (
              <>
                <ScrollView style={styles.cartItemList}>
                  {cartItems.map((item, index) => (
                    <View key={`${item.id}-${index}`} style={styles.cartModalItem}>
                      <View style={styles.cartItemInfo}>
                        <Text style={styles.cartItemName}>{item.name}</Text>
                        <Text style={styles.cartItemPrice}>
                          R$ {item.price.toFixed(2)} x {item.quantity || 1} = 
                          R$ {((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.cartItemRemove}
                        onPress={() => removeFromCart(item.id)}
                      >
                        <Ionicons name="trash-outline" size={20} color="red" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
                
                <View style={styles.cartTotalContainer}>
                  <Text style={styles.cartTotalText}>
                    Total: R$ {totalValue.toFixed(2)}
                  </Text>
                </View>
                
                <View style={styles.cartModalActions}>
                  <TouchableOpacity 
                    style={styles.cartActionButton}
                    onPress={() => {
                      setShowCartModal(false);
                    }}
                  >
                    <Text style={styles.cartActionButtonText}>Ir para Checkout</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.cartActionButton, styles.clearCartButton]}
                    onPress={() => {
                      clearCart();
                      showToast('Carrinho esvaziado');
                    }}
                  >
                    <Text style={styles.cartActionButtonText}>Limpar Carrinho</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat com Assistente IA</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.newChatButton}
            onPress={() => {
              console.log('Botão Nova Conversa pressionado');
              startNewConversation();
            }}
          >
            <Ionicons name="chatbubble-outline" size={20} color="white" />
            <Text style={styles.newChatButtonText}>Nova Conversa</Text>
          </TouchableOpacity>
          
          {!isConnected && (
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
          <Balloon 
            message={item} 
            currentUserId={userId}
            onAddToCart={handleAddToCart} 
          />
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

      {showProductList && productsToShow.length > 0 && (
        <View style={styles.productListContainer}>
          <Text style={styles.productListTitle}>Produtos disponíveis:</Text>
          <FlatList
            horizontal
            data={productsToShow}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.productItem}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productPrice}>R$ {item.price.toFixed(2)}</Text>
                <TouchableOpacity 
                  style={styles.addToCartButton}
                  onPress={() => handleAddToCart(item)}
                >
                  <Text style={styles.addToCartText}>Adicionar</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}

      {renderCartModal()}

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
  onAddToCart
}: {
  message: Message;
  currentUserId: string | null;
  onAddToCart: (product: any) => void;
}) => {
  const isAi = message.userId === 'ai-assistant';
  const isSelf = message.userId === currentUserId;
  const isSystem = message.isSystemMessage;
  
  if (isSystem) {
    return (
      <View style={styles.systemMessageContainer}>
        <Text style={styles.systemMessageText}>{message.text}</Text>
      </View>
    );
  }
  
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
        
        {message.showProductList && message.productList && message.productList.length > 0 && (
          <View style={styles.inlineProductList}>
            {message.productList.map((product: any) => (
              <View key={product.id} style={styles.inlineProductItem}>
                <Text style={styles.inlineProductName}>• {product.name}</Text>
                <Text style={styles.inlineProductPrice}>R$ {product.price.toFixed(2)}</Text>
                <TouchableOpacity 
                  style={styles.inlineAddButton}
                  onPress={() => onAddToCart(product)}
                >
                  <Text style={styles.inlineAddButtonText}>Adicionar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
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
  newChatButton: {
    backgroundColor: '#28a745',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  newChatButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  productListContainer: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  productListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  productItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    width: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  productName: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  productPrice: {
    color: 'green',
    fontSize: 14,
    marginBottom: 8,
  },
  addToCartButton: {
    backgroundColor: '#007bff',
    borderRadius: 4,
    padding: 6,
    alignItems: 'center',
  },
  addToCartText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  systemMessageText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
    backgroundColor: '#f0f0f0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  inlineProductList: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
    paddingTop: 8,
  },
  inlineProductItem: {
    marginBottom: 8,
  },
  inlineProductName: {
    fontSize: 14,
    color: 'white',
    fontWeight: 'bold',
  },
  inlineProductPrice: {
    fontSize: 14,
    color: '#ffff00',
    marginBottom: 4,
  },
  inlineAddButton: {
    backgroundColor: 'white',
    borderRadius: 4,
    padding: 4,
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  inlineAddButtonText: {
    color: '#8a2be2',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cartModalContent: {
    backgroundColor: 'white',
    width: '100%',
    maxHeight: '80%',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  cartModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  cartModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  emptyCartMessage: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyCartText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  cartItemList: {
    maxHeight: 300,
  },
  cartModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cartItemPrice: {
    color: 'green',
  },
  cartItemRemove: {
    padding: 8,
  },
  cartTotalContainer: {
    marginTop: 15,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'flex-end',
  },
  cartTotalText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cartModalActions: {
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cartActionButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cartActionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  clearCartButton: {
    backgroundColor: '#dc3545',
  },
});

export default Chat;
