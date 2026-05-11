import { createContext, useContext, useState, type ReactNode } from 'react';
import type { StoreProduct } from '../services/api';

export interface CartSnapshot {
  id: string;
  name: string;
  unit: string;
  price: number;
}

export interface CartItem {
  product: CartSnapshot;
  quantity: number;
}

export function toCartSnapshot(p: StoreProduct): CartSnapshot {
  return { id: p.id, name: p.name, unit: p.unit, price: p.price };
}

interface CartState {
  cart: CartItem[];
  addToCart: (product: StoreProduct | CartSnapshot) => void;
  updateQty: (productId: string, delta: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
}

const CART_KEY = 'kibondo_cart';

function loadCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(CART_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCart(cart: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(loadCart);

  function updateCart(updater: (prev: CartItem[]) => CartItem[]) {
    setCart(prev => {
      const next = updater(prev);
      saveCart(next);
      return next;
    });
  }

  function addToCart(product: StoreProduct | CartSnapshot) {
    const snapshot: CartSnapshot = 'category_id' in product
      ? toCartSnapshot(product as StoreProduct)
      : product as CartSnapshot;
    updateCart(prev => {
      const existing = prev.find(i => i.product.id === snapshot.id);
      if (existing) return prev.map(i => i.product.id === snapshot.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product: snapshot, quantity: 1 }];
    });
  }

  function updateQty(productId: string, delta: number) {
    updateCart(prev =>
      prev.flatMap(i => {
        if (i.product.id !== productId) return [i];
        const q = i.quantity + delta;
        return q > 0 ? [{ ...i, quantity: q }] : [];
      })
    );
  }

  function clearCart() {
    setCart([]);
    localStorage.removeItem(CART_KEY);
  }

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQty, clearCart, cartCount, cartTotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
