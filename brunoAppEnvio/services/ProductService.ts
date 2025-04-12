import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL = 'http://192.168.0.105:3000';

export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  quantity: number;
  imageUrl?: string;
}

export class ProductService {
  static async getAllProducts(): Promise<Product[]> {
    const response = await axios.get(`${SERVER_URL}/api/public/products`);
    
    // Adiciona uma URL de imagem padrão aos produtos do banco se não possuírem
    const productsWithImages = response.data.map((product: any) => ({
      ...product,
      imageUrl: product.imageUrl || 'https://via.placeholder.com/150'
    }));
    
    return productsWithImages;
  }

  static async getProductById(id: string): Promise<Product> {
    const token = await AsyncStorage.getItem('authToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    
    const response = await axios.get(`${SERVER_URL}/api/product/${id}`, { headers });
    return {
      ...response.data,
      imageUrl: response.data.imageUrl || 'https://via.placeholder.com/150'
    };
  }
}
