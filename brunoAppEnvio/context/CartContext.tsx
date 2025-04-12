import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interface para representar um produto
interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  quantity?: number; // Quantidade opcional para controle no carrinho
}

interface CartContextType {
  cartItems: Product[];
  addToCart: (product: Product) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, newQuantity: number) => void;
  clearCart: () => void;
  itemCount: number; // Contador de itens no carrinho
  totalValue: number; // Valor total do carrinho
}

const CART_STORAGE_KEY = '@SupermarketApp:cart';

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<Product[]>([]);
  const [itemCount, setItemCount] = useState(0);
  const [totalValue, setTotalValue] = useState(0);

  // Carrega o carrinho do AsyncStorage ao iniciar
  useEffect(() => {
    loadCart();
  }, []);

  // Atualiza contadores quando o carrinho muda
  useEffect(() => {
    setItemCount(cartItems.length);
    const total = cartItems.reduce(
      (sum, item) => sum + (item.price * (item.quantity || 1)), 
      0
    );
    setTotalValue(total);
    
    // Salva no AsyncStorage quando o carrinho é modificado
    saveCart();
  }, [cartItems]);

  // Carrega o carrinho do armazenamento local
  const loadCart = async () => {
    try {
      const savedCart = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error('Erro ao carregar carrinho:', error);
    }
  };

  // Salva o carrinho no armazenamento local
  const saveCart = async () => {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (error) {
      console.error('Erro ao salvar carrinho:', error);
    }
  };

  // Adiciona um produto ao carrinho
  const addToCart = (product: Product) => {
    console.log(`Adicionando ao carrinho: ${product.name}`);
    
    // Verifica se o produto já existe no carrinho
    const existingItemIndex = cartItems.findIndex(item => item.id === product.id);
    
    if (existingItemIndex >= 0) {
      // Produto já existe, incrementa a quantidade
      const updatedCart = [...cartItems];
      const currentQty = updatedCart[existingItemIndex].quantity || 1;
      updatedCart[existingItemIndex] = {
        ...updatedCart[existingItemIndex],
        quantity: currentQty + 1
      };
      setCartItems(updatedCart);
    } else {
      // Produto novo, adiciona com quantidade 1
      setCartItems(prevItems => [
        ...prevItems, 
        { ...product, quantity: 1 }
      ]);
    }
  };

  // Remove um produto do carrinho
  const removeFromCart = (itemId: string) => {
    setCartItems(prevItems => prevItems.filter((item) => item.id !== itemId));
  };

  // Atualiza a quantidade de um produto no carrinho
  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    
    setCartItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId 
          ? { ...item, quantity: newQuantity } 
          : item
      )
    );
  };

  // Limpa o carrinho
  const clearCart = () => {
    setCartItems([]);
  };

  const value: CartContextType = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    itemCount,
    totalValue
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart deve ser usado dentro de um CartProvider');
  }
  return context;
};