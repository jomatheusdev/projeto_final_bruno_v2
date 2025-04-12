import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { useCart } from '../../context/CartContext'; 
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
}

export default function CartScreen() {
  const { cartItems, removeFromCart, clearCart, updateQuantity } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const SERVER_URL = 'http://192.168.0.105:3000';
  
  const paymentMethods: PaymentMethod[] = [
    { id: 'credit', name: 'Cartão de Crédito', icon: 'card-outline' },
    { id: 'pix', name: 'Pix', icon: 'qr-code-outline' },
    { id: 'cash', name: 'Dinheiro na Entrega', icon: 'cash-outline' }
  ];

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0);
  };

  const handleQuantityChange = (itemId: string, change: number) => {
    const item = cartItems.find(item => item.id === itemId);
    if (item) {
      const currentQty = item.quantity || 1;
      const newQty = Math.max(1, currentQty + change); // Não permite quantidade menor que 1
      updateQuantity(itemId, newQty);
    }
  };

  const handleRemoveItem = (itemId: string, itemName: string) => {
    removeFromCart(itemId);
  };

  const startCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert("Carrinho vazio", "Adicione produtos antes de finalizar a compra");
      return;
    }
    
    setShowPaymentMethods(true);
  };

  const handlePaymentSelection = (methodId: string) => {
    setSelectedPaymentMethod(methodId);
    processPayment(methodId);
  };

  const processPayment = async (methodId: string) => {
    if (cartItems.length === 0) {
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Preparar dados para envio
      const total = calculateTotal();
      const items = cartItems.map(item => ({
        id: item.id,
        quantity: item.quantity || 1,
        price: item.price
      }));
      
      // Obter token de autenticação
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Erro', 'Você precisa estar logado para finalizar a compra');
        setIsProcessing(false);
        return;
      }
      
      // Enviar pedido para o servidor
      const response = await axios.post(
        `${SERVER_URL}/api/orders`,
        {
          items,
          total,
          paymentMethod: methodId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Processar sucesso
      if (response.status === 201) {
        // Limpar o carrinho imediatamente após o pagamento ser processado com sucesso
        clearCart();
        
        setIsProcessing(false);
        setShowPaymentMethods(false);
        
        // Formatar data da compra
        let orderDate = "";
        if (response.data.orderDate) {
          const date = new Date(response.data.orderDate);
          orderDate = date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR');
        }
        
        // Mensagem detalhada sobre a compra
        const resumoCompra = 
          `Pedido #${response.data.orderId} - ${orderDate}\n\n` +
          `Método de pagamento: ${getPaymentMethodName(response.data.paymentMethod)}\n` +
          `Total de itens: ${response.data.totalItems}\n` + 
          `Quantidade de produtos: ${response.data.uniqueProducts}\n` +
          `Valor total: R$ ${response.data.totalAmount}\n\n` +
          `Itens comprados:\n` +
          `${response.data.items?.map(item => 
            `• ${item.name} (${item.quantity}x): R$ ${item.total.toFixed(2)}`
          ).join('\n')}`;
        
        Alert.alert(
          "Compra finalizada com sucesso!",
          resumoCompra,
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      setIsProcessing(false);
      
      // Processar erro
      let errorMessage = 'Ocorreu um erro ao processar o pagamento';
      
      if (axios.isAxiosError(error) && error.response) {
        errorMessage = error.response.data.message || errorMessage;
      }
      
      Alert.alert("Erro na compra", errorMessage);
    }
  };
  
  // Função para obter o nome do método de pagamento pelo ID
  const getPaymentMethodName = (methodId: string): string => {
    const method = paymentMethods.find(m => m.id === methodId);
    return method ? method.name : methodId;
  };

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="basket-outline" size={32} color="#ccc" />
        </View>
      )}
      
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPreco}>R$ {item.price.toFixed(2)}</Text>
      </View>
      
      <View style={styles.quantityContainer}>
        <TouchableOpacity 
          style={styles.quantityButton} 
          onPress={() => handleQuantityChange(item.id, -1)}
        >
          <Text style={styles.quantityButtonText}>-</Text>
        </TouchableOpacity>
        
        <Text style={styles.quantityText}>{item.quantity || 1}</Text>
        
        <TouchableOpacity 
          style={styles.quantityButton} 
          onPress={() => handleQuantityChange(item.id, 1)}
        >
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={styles.removerBotao} 
        onPress={() => handleRemoveItem(item.id, item.name)}
      >
        <Ionicons name="trash-outline" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderPaymentMethods = () => (
    <View style={styles.paymentMethodsContainer}>
      <Text style={styles.paymentMethodsTitle}>Forma de Pagamento</Text>
      {paymentMethods.map(method => (
        <TouchableOpacity 
          key={method.id}
          style={[
            styles.paymentMethodButton,
            selectedPaymentMethod === method.id && styles.selectedPaymentMethod
          ]}
          onPress={() => handlePaymentSelection(method.id)}
          disabled={isProcessing}
        >
          <Ionicons name={method.icon} size={24} color={selectedPaymentMethod === method.id ? "#fff" : "#333"} />
          <Text style={[
            styles.paymentMethodText,
            selectedPaymentMethod === method.id && styles.selectedPaymentMethodText
          ]}>
            {method.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.titulo}>Carrinho de Compras</Text>
      
      {cartItems.length === 0 ? (
        <View style={styles.emptyCartContainer}>
          <Ionicons name="cart-outline" size={64} color="#999" />
          <Text style={styles.emptyCartText}>Seu carrinho está vazio</Text>
          <Text style={styles.emptyCartSubtext}>
            Adicione produtos do catálogo ou peça ajuda ao assistente virtual
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            style={styles.cartItemsList}
            contentContainerStyle={styles.cartItemsContent}
          />
          
          {!showPaymentMethods ? (
            <View style={styles.summaryContainer}>
              <View style={styles.resumoContainer}>
                <Text style={styles.resumoTitle}>Resumo da compra</Text>
                
                <View style={styles.resumoRow}>
                  <Text>Subtotal ({cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'})</Text>
                  <Text>R$ {calculateTotal().toFixed(2)}</Text>
                </View>
                
                <View style={styles.resumoRow}>
                  <Text>Frete</Text>
                  <Text style={styles.freeShipping}>Grátis</Text>
                </View>
                
                <View style={[styles.resumoRow, styles.totalRow]}>
                  <Text style={styles.totalText}>Total</Text>
                  <Text style={styles.totalPreco}>R$ {calculateTotal().toFixed(2)}</Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.checkoutButton}
                onPress={startCheckout}
              >
                <Ionicons name="cart-outline" size={20} color="#fff" style={styles.checkoutIcon} />
                <Text style={styles.checkoutButtonText}>
                  Finalizar Compra
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.summaryContainer}>
              {renderPaymentMethods()}
              
              {isProcessing && (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color="#007bff" />
                  <Text style={styles.processingText}>Processando pagamento...</Text>
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowPaymentMethods(false)}
                disabled={isProcessing}
              >
                <Text style={styles.cancelButtonText}>Voltar</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    textAlign: 'center',
    backgroundColor: '#fff',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyCartText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 16,
  },
  emptyCartSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
  cartItemsList: {
    flex: 1,
  },
  cartItemsContent: {
    padding: 8,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
  },
  imagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
    backgroundColor: '#f1f1f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemPreco: {
    fontSize: 15,
    color: 'green',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    borderRadius: 4,
    marginRight: 8,
    paddingHorizontal: 2,
  },
  quantityButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
  removerBotao: {
    backgroundColor: '#ff6347',
    padding: 8,
    borderRadius: 8,
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  resumoContainer: {
    marginBottom: 16,
  },
  resumoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  resumoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  freeShipping: {
    color: 'green',
  },
  totalRow: {
    marginTop: 8,
    borderBottomWidth: 0,
  },
  totalText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  totalPreco: {
    fontWeight: 'bold',
    fontSize: 18,
    color: 'green',
  },
  checkoutButton: {
    backgroundColor: '#007bff',
    padding: 16,
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  checkoutIcon: {
    marginRight: 8,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  paymentMethodsContainer: {
    marginBottom: 16,
  },
  paymentMethodsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  paymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedPaymentMethod: {
    borderColor: '#007bff',
    backgroundColor: '#007bff',
  },
  paymentMethodText: {
    fontSize: 16,
    marginLeft: 12,
  },
  selectedPaymentMethodText: {
    color: 'white',
    fontWeight: 'bold',
  },
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  processingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#555',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
