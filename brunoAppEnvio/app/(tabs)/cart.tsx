import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useCart } from '../../context/CartContext'; 

export default function CartScreen() {
  const { cartItems, removeFromCart } = useCart();

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + item.price, 0);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.titulo}>Carrinho de Compras</Text>
      <ScrollView style={styles.cartItems}>
        {cartItems.map((item) => (
          <View style={styles.cartItem} key={item.id}>
            <View style={styles.itemDetalhes}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPreco}>R$ {item.price.toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.removerBotao} onPress={() => removeFromCart(item.id)}>
              <Text style={styles.removerTextoBotao}>x</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>Total:</Text>
        <Text style={styles.totalPreco}>R$ {calculateTotal().toFixed(2)}</Text>
      </View>
      <View style={styles.checkoutButtonContainer}>
        <Text style={styles.checkoutButton}>Finalizar Compra</Text>
      </View>
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
  cartItems: {
    flex: 1,
    paddingHorizontal: 16,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemDetalhes: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemPreco: {
    fontSize: 16,
    color: 'green',
  },
  removerBotao: {
    backgroundColor: '#ff6347',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  removerTextoBotao: {
    color: '#fff',
    fontWeight: 'bold',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalPreco: {
    fontSize: 18,
    color: 'green',
  },
  checkoutButtonContainer: {
    padding: 16,
    backgroundColor: '#007bff',
    alignItems: 'center',
  },
  checkoutButton: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
