import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL = 'http://192.168.0.105:3000';

export interface AuthResponse {
  token: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  cpf: string;
  role?: string;
}

export interface RegisterUserData {
  name: string;
  email: string;
  cpf: string;
  password: string;
  confirmPassword: string;
}

export class UserService {
  static async login(email: string, password: string): Promise<AuthResponse> {
    const response = await axios.post(`${SERVER_URL}/api/login`, { email, password });
    return response.data;
  }

  static async register(userData: RegisterUserData): Promise<void> {
    await axios.post(`${SERVER_URL}/api/user`, userData);
  }

  static async getUserInfo(userId: string): Promise<User> {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      throw new Error('Usuário não autenticado');
    }

    const response = await axios.get(`${SERVER_URL}/api/user/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        return null;
      }

      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(atob(tokenParts[1]));
      const userId = payload.id;

      return await this.getUserInfo(userId);
    } catch (error) {
      console.error('Erro ao buscar usuário atual:', error);
      return null;
    }
  }
}

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
