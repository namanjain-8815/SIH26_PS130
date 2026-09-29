'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from './api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  org_id: string | null;
  department_id: string | null;
  department?: { id: string; name: string } | null;
  organization?: { id: string; name: string; legal_name?: string } | null;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  entity_name: string;
  entity_type?: string;
  sector?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  setAuthSession: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Session-scoped token per Milestone B0.10: checks sessionStorage, clears legacy localStorage if found
    let token: string | null = null;
    if (typeof window !== 'undefined') {
      token = window.sessionStorage.getItem('token') || window.localStorage.getItem('token');
      if (token && !window.sessionStorage.getItem('token')) {
        window.sessionStorage.setItem('token', token);
      }
      window.localStorage.removeItem('token');
    }

    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<AuthUser>('/auth/me')
      .then(setUser)
      .catch(() => {
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem('token');
          window.localStorage.removeItem('token');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const result = await api.post<{ token: string; user: AuthUser }>('/auth/login', { email, password });
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('token', result.token);
      window.localStorage.removeItem('token');
    }
    setUser(result.user);
  }

  async function register(data: RegisterInput) {
    const result = await api.post<{ token: string; user: AuthUser }>('/auth/register', data);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('token', result.token);
      window.localStorage.removeItem('token');
    }
    setUser(result.user);
  }

  function setAuthSession(token: string, newUser: AuthUser) {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('token', token);
      window.localStorage.removeItem('token');
    }
    setUser(newUser);
  }

  function logout() {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('token');
      window.localStorage.removeItem('token');
    }
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, setAuthSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
