import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi, getCsrfCookie, notificationsApi } from '../services/api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ otpRequired: true; challengeToken: string; message: string } | void>;
  verifyOtp: (challengeToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => {
    const stored = localStorage.getItem('kibondo_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Verify session on mount — source of truth is the server, not localStorage
  useEffect(() => {
    authApi.me()
      .then((u) => { setUserState(u); localStorage.setItem('kibondo_user', JSON.stringify(u)); })
      .catch(() => { setUserState(null); localStorage.removeItem('kibondo_user'); })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    await getCsrfCookie();
    const res = await authApi.login(email, password);
    if ('otp_required' in res) {
      return { otpRequired: true as const, challengeToken: res.challenge_token, message: res.message };
    }
    localStorage.setItem('kibondo_user', JSON.stringify(res.user));
    setUserState(res.user);
  }

  async function verifyOtp(challengeToken: string, code: string) {
    const { user: u } = await authApi.verifyOtp(challengeToken, code);
    localStorage.setItem('kibondo_user', JSON.stringify(u));
    setUserState(u);
  }

  async function logout() {
    try { await notificationsApi.deleteFcmToken(); } catch {}
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('kibondo_user');
    setUserState(null);
  }

  function updateUser(u: User) {
    setUserState(u);
    localStorage.setItem('kibondo_user', JSON.stringify(u));
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, verifyOtp, logout, setUser: updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
