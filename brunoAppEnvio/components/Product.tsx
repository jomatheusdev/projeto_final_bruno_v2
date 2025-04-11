import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  onAddToCart: () => void; 
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 20) / 2;

export default function ProductCard({ id, name, price, imageUrl, onAddToCart }: ProductCardProps) {
  return (
    <View style={[styles.card, { width: cardWidth }]}>
      <Image source={{ uri: imageUrl }} style={styles.image} />
      <View style={styles.detalhes}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.preco}>R$ {price.toFixed(2)}</Text>
        <TouchableOpacity style={styles.addButton} onPress={onAddToCart}>
          <Text style={styles.addButtonText}>Add +</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 5,
  },
  detalhes: {
    padding: 5,
  },
  name: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  preco: {
    fontSize: 12,
    color: 'green',
  },
  addButton: {
    backgroundColor: '#007bff',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },

});
