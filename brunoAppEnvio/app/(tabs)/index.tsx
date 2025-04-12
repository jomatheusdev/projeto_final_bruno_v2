import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import ProductCard from '../../components/Product';
import { useCart } from '../../context/CartContext';
import axios from 'axios';

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  quantity: number;
  imageUrl: string;
}

export default function HomeScreen() {
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const SERVER_URL = 'http://192.168.0.105:3000';
      const response = await axios.get(`${SERVER_URL}/api/public/products`);
      
      // Adiciona uma URL de imagem padrão aos produtos do banco
      const productsWithImages = response.data.map((product: any) => ({
        ...product,
        imageUrl: product.imageUrl || 'https://via.placeholder.com/150'
      }));
      
      setProducts(productsWithImages);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
      setError('Não foi possível carregar os produtos. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Carregando produtos...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retryText} onPress={fetchProducts}>Tentar novamente</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.titulo}>Produtos</Text>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryText: {
    color: '#007bff',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});