import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
}

interface ProductListProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

const ProductList = ({ products, onAddToCart }: ProductListProps) => {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <View style={styles.productListContainer}>
      <Text style={styles.productListTitle}>Produtos disponíveis:</Text>
      <FlatList
        horizontal
        data={products}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.productItem}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productPrice}>R$ {item.price.toFixed(2)}</Text>
            <TouchableOpacity 
              style={styles.addToCartButton}
              onPress={() => onAddToCart(item)}
            >
              <Text style={styles.addToCartText}>Adicionar</Text>
            </TouchableOpacity>
          </View>
        )}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default ProductList;
