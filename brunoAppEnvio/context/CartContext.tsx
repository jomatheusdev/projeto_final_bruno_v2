import React, { createContext, useState, useContext } from 'react';

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
}

interface CartContextType {
  cartItems: Product[];
  addToCart: (product: Product) => void;
  removeFromCart: (itemId: string) => void;
  addProductsFromAI: (products: Product[]) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<Product[]>([]);

  const addToCart = (product: Product) => {
    console.log(`Adicionando ao carrinho: ${product.name}`);
    setCartItems(prevItems => [...prevItems, product]);
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prevItems => prevItems.filter((item) => item.id !== itemId));
  };

  const addProductsFromAI = (products: Product[]) => {
    if (products && products.length > 0) {
      console.log(`Adicionando ${products.length} produto(s) ao carrinho via IA:`, products);
      setCartItems(prevItems => [...prevItems, ...products]);
    } else {
      console.warn('Tentativa de adicionar produtos vazios ao carrinho');
    }
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const value: CartContextType = {
    cartItems,
    addToCart,
    removeFromCart,
    addProductsFromAI,
    clearCart
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