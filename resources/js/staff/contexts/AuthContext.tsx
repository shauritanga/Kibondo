import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi, notificationsApi } from '../services/api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('kibondo_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('kibondo_token'));
  const [isLoading, setIsLoading] = useState(!!localStorage.getItem('kibondo_token') && !localStorage.getItem('kibondo_user'));

  useEffect(() => {
    if (token && !user) {
      authApi.me()
        .then((u) => { setUser(u); localStorage.setItem('kibondo_user', JSON.stringify(u)); })
        .catch(() => { setToken(null); localStorage.removeItem('kibondo_token'); })
        .finally(() => setIsLoading(false));
    }
  }, [token, user]);

  async function login(email: string, password: string) {
    const { token: t, user: u } = await authApi.login(email, password);
    localStorage.setItem('kibondo_token', t);
    localStorage.setItem('kibondo_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  }

  async function logout() {
    try { await notificationsApi.deleteFcmToken(); } catch {}
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('kibondo_token');
    localStorage.removeItem('kibondo_user');
    setToken(null);
    setUser(null);
  }

  function updateUser(u: User) {
    setUser(u);
    localStorage.setItem('kibondo_user', JSON.stringify(u));
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, setUser: updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
