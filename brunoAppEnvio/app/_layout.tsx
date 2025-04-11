import { CartProvider } from "@/context/CartContext";
import { Slot, useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from "react";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    async function checkLoginStatus() {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        router.replace("/(tabs)");
      } else {
        router.replace("/auth");
      }
    }

    checkLoginStatus();
  }, [router]);

  return (
    <CartProvider>
      <Slot />
    </CartProvider>
  );
}