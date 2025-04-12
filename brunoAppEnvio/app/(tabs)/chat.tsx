import React, { useRef } from 'react';
import {
  FlatList,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../context/CartContext';

// Componentes
import MessageBalloon from '../../components/chat/MessageBalloon';
import ProductList from '../../components/chat/ProductList';
import CartModal from '../../components/chat/CartModal';

// Hooks
import { useAIChat } from '../../hooks/useAIChat';

const Chat = () => {
  const { addToCart, removeFromCart, clearCart, cartItems, totalValue } = useCart();
  const flatListRef = useRef<FlatList>(null);
  
  const {
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
    
    setMessage,
    setAutoReconnect,
    setShowCartModal,
    
    sendMessage,
    manualReconnect,
    startNewConversation,
    handleAddToCart
  } = useAIChat(addToCart, removeFromCart, clearCart);

  // Scroll para o final da lista quando chegar uma nova mensagem
  const scrollToEnd = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
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
      {/* Cabeçalho */}
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

      {/* Banner de status da conexão */}
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
      
      {/* Banner de status da API */}
      {isConnected && !isApiAvailable && (
        <View style={styles.apiBanner}>
          <Text style={styles.apiWarningText}>
            ⚠️ Serviço de IA com funcionamento limitado
          </Text>
        </View>
      )}

      {/* Lista de mensagens */}
      <FlatList
        ref={flatListRef}
        style={styles.flatList}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBalloon 
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
        onContentSizeChange={scrollToEnd}
      />

      {/* Lista de produtos horizontal */}
      {showProductList && productsToShow.length > 0 && (
        <ProductList 
          products={productsToShow}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Modal do carrinho */}
      <CartModal
        visible={showCartModal}
        onClose={() => setShowCartModal(false)}
        cartItems={cartItems}
        totalValue={totalValue}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
      />

      {/* Input para envio de mensagem */}
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
          onPress={sendMessage}
          disabled={!isConnected}
        >
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
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
});

export default Chat;
