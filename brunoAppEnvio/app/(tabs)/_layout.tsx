import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function TabLayout() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('authToken'); // Remove o token
      Alert.alert('Sucesso', 'Logout realizado com sucesso!');
      router.replace('/auth'); // Redireciona para a tela de login
    } catch (error) {
      Alert.alert('Erro', 'Erro ao realizar logout.');
    }
  };

  return (
    <Tabs
      screenOptions={{
        headerRight: () => (
          <Button title="Logout" onPress={handleLogout} color="#007bff" />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Carrinho',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="shopping-cart" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'artificial intelligence',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="chat" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" color={color} size={size} />
          ),
        }}/>
    </Tabs>
  );
}