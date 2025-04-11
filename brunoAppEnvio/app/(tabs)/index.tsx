import React from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import ProductCard from '../../components/Product';
import { useCart } from '../../context/CartContext';

const products = [
  { id: '1', name: 'Arroz', price: 10.99, imageUrl: 'https://via.placeholder.com/150' },
  { id: '2', name: 'Feijão', price: 8.50, imageUrl: 'https://via.placeholder.com/150' },
  { id: '3', name: 'Macarrão', price: 5.99, imageUrl: 'https://via.placeholder.com/150' },
  { id: '4', name: 'Leite', price: 4.50, imageUrl: 'https://via.placeholder.com/150' },
  { id: '5', name: 'Ovos', price: 7.99, imageUrl: 'https://via.placeholder.com/150' },
  { id: '6', name: 'Pão', price: 3.50, imageUrl: 'https://via.placeholder.com/150' },
  { id: '7', name: 'Frango', price: 15.99, imageUrl: 'https://via.placeholder.com/150' },
  { id: '8', name: 'Carne', price: 25.50, imageUrl: 'https://via.placeholder.com/150' },
];

export default function HomeScreen() {
  const { addToCart } = useCart();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.titulo}>Produtos</Text>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard
            {...item}
            onAddToCart={() => addToCart(item)}
          />
        )}
        numColumns={2}
        contentContainerStyle={styles.containerLista}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    textAlign: 'center',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  containerLista: {
    paddingHorizontal: 8,
  },
});