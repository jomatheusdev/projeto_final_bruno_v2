import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  quantity?: number;
}

interface CartModalProps {
  visible: boolean;
  onClose: () => void;
  cartItems: Product[];
  totalValue: number;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
}

const CartModal = ({
  visible,
  onClose,
  cartItems,
  totalValue,
  onRemoveItem,
  onClearCart
}: CartModalProps) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.cartModalContent}>
          <View style={styles.cartModalHeader}>
            <Text style={styles.cartModalTitle}>Seu Carrinho</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
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
                      onPress={() => onRemoveItem(item.id)}
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
                <TouchableOpacity style={styles.cartActionButton} onPress={onClose}>
                  <Text style={styles.cartActionButtonText}>Ir para Checkout</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.cartActionButton, styles.clearCartButton]}
                  onPress={onClearCart}
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

const styles = StyleSheet.create({
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

export default CartModal;
