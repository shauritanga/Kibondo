import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { storeAuthApi, TOKEN_KEY, CUSTOMER_KEY, type StoreCustomer } from '../services/api';

interface StoreAuthState {
  customer: StoreCustomer | null;
  isLoading: boolean;
  register: (payload: { name: string; phone: string; email: string; password: string; password_confirmation: string }) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const StoreAuthContext = createContext<StoreAuthState | null>(null);

export function StoreAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<StoreCustomer | null>(() => {
    const stored = localStorage.getItem(CUSTOMER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoading, setIsLoading] = useState(
    !!localStorage.getItem(TOKEN_KEY) && !localStorage.getItem(CUSTOMER_KEY)
  );

  useEffect(() => {
    if (localStorage.getItem(TOKEN_KEY) && !customer) {
      storeAuthApi.me()
        .then((c) => { setCustomer(c); localStorage.setItem(CUSTOMER_KEY, JSON.stringify(c)); })
        .catch(() => { localStorage.removeItem(TOKEN_KEY); })
        .finally(() => setIsLoading(false));
    }
  }, []);

  async function register(payload: Parameters<typeof storeAuthApi.register>[0]) {
    const { token, customer: c } = await storeAuthApi.register(payload);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(c));
    setCustomer(c);
  }

  async function login(email: string, password: string) {
    const { token, customer: c } = await storeAuthApi.login(email, password);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(c));
    setCustomer(c);
  }

  async function logout() {
    try { await storeAuthApi.logout(); } catch {}
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_KEY);
    setCustomer(null);
  }

  return (
    <StoreAuthContext.Provider value={{ customer, isLoading, register, login, logout }}>
      {children}
    </StoreAuthContext.Provider>
  );
}

export function useStoreAuth() {
  const ctx = useContext(StoreAuthContext);
  if (!ctx) throw new Error('useStoreAuth must be used inside StoreAuthProvider');
  return ctx;
}
