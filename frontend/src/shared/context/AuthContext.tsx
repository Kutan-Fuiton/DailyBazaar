/**
 * AuthContext — Global authentication state.
 *
 * Provides: user, token, isLoading, login(), register(), loginDemo(), loginWithGoogle(), logout()
 * Persists token to localStorage("spendly_token").
 * On mount, auto-validates token via GET /auth/me.
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { authApi } from "../api/auth";
import { authToken } from "../api/client";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem("spendly_user");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(() => {
    const token = authToken.get();
    const hasCachedUser = !!localStorage.getItem("spendly_user");
    return token ? !hasCachedUser : false;
  });

  // On mount: if a token exists, validate it in the background
  useEffect(() => {
    const token = authToken.get();
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi.me()
      .then((u) => {
        setUser(u);
        try {
          localStorage.setItem("spendly_user", JSON.stringify(u));
        } catch {}
      })
      .catch(() => {
        authToken.clear();
        try {
          localStorage.removeItem("spendly_user");
        } catch {}
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const clearAllHomeCaches = (userId?: number) => {
    try {
      localStorage.removeItem("vaniq_home_cache_v2");
      sessionStorage.removeItem("vaniq_home_cache");
      if (userId) {
        localStorage.removeItem(`vaniq_home_cache_u${userId}`);
      }
    } catch {}
  };

  const login = useCallback(async (username: string, password: string) => {
    clearAllHomeCaches();
    const { access_token, refresh_token } = await authApi.login(username, password);
    authToken.set(access_token);
    if (refresh_token) authToken.setRefresh(refresh_token);
    const me = await authApi.me();
    setUser(me);
    try { localStorage.setItem("spendly_user", JSON.stringify(me)); } catch {}
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    clearAllHomeCaches();
    await authApi.register(username, email, password);
    // Auto-login after register
    const { access_token, refresh_token } = await authApi.login(username, password);
    authToken.set(access_token);
    if (refresh_token) authToken.setRefresh(refresh_token);
    const me = await authApi.me();
    setUser(me);
    try { localStorage.setItem("spendly_user", JSON.stringify(me)); } catch {}
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    clearAllHomeCaches();
    const { access_token, refresh_token } = await authApi.googleLogin(credential);
    authToken.set(access_token);
    if (refresh_token) authToken.setRefresh(refresh_token);
    const me = await authApi.me();
    setUser(me);
    try { localStorage.setItem("spendly_user", JSON.stringify(me)); } catch {}
  }, []);

  const logout = useCallback(() => {
    clearAllHomeCaches(user?.id);
    authToken.clear();
    try { localStorage.removeItem("spendly_user"); } catch {}
    setUser(null);
  }, [user?.id]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
