import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage
import { useRouter } from 'expo-router';
import httpService from '../services/httpService';

export default function LoginScreen() {
  const router = useRouter();
  const SERVER_URL = 'http://192.168.0.105:3000';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const validarEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleLogin = async () => {
    if (!validarEmail(email)) {
      Alert.alert('Erro', 'Formato de email inválido.');
      return;
    }

    try {
      const loginUrl = `${SERVER_URL}/api/login`;
      const response = await httpService.post(loginUrl, { email, password });
      const { token } = response.data;

      // Salvar o token no AsyncStorage
      await AsyncStorage.setItem('authToken', token);

      Alert.alert('Sucesso', 'Login realizado com sucesso!');
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Erro', 'Credenciais inválidas ou erro no servidor.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        value={password}
        secureTextEntry
        onChangeText={setPassword}
      />
      <Button title="Entrar" onPress={handleLogin} />
      <TouchableOpacity onPress={() => router.push('/auth/register')}>
        <Text style={styles.registrar}>Não tem login? Registre-se</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  registrar: {
    marginTop: 20,
    color: 'blue',
    textAlign: 'center',
  },
});