import { CartProvider } from "@/context/CartContext";
import { Slot, useRouter } from "expo-router";
import { useState, useEffect } from "react";

export default function RootLayout() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkLoginStatus() {
      setIsLoggedIn(false);
      setIsLoading(false);

      if (isLoggedIn) {
        router.replace("/(tabs)");
      } else {
        router.replace("/auth");
      }
    }

    checkLoginStatus();
  }, []);

  return (
    <CartProvider>
      <Slot />
    </CartProvider>
  );
}