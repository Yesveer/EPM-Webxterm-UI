'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, User, TenantInfo } from '@/lib/auth-api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  sessionToken: string | null;
  availableTenants: TenantInfo[];
  login: (token: string, user: User, sessionToken?: string, tenants?: TenantInfo[]) => void;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Idle session timeout — mirrors Azure portal's behavior: 6 hours with no user
// activity anywhere in the app triggers an automatic logout. Stored in
// localStorage (not React state) so it's shared across tabs.
const SESSION_IDLE_TIMEOUT_MS = 6 * 60 * 60 * 1000;
const ACTIVITY_STORAGE_KEY = 'vsay-last-activity';
const ACTIVITY_THROTTLE_MS = 30 * 1000; // don't hammer localStorage on every mousemove
const IDLE_CHECK_INTERVAL_MS = 60 * 1000;

function markActivity() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVITY_STORAGE_KEY, String(Date.now()));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('vsay-user');
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vsay-token');
    }
    return null;
  });

  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vsay-session-token');
    }
    return null;
  });

  const [availableTenants, setAvailableTenants] = useState<TenantInfo[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('vsay-available-tenants');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  const isAuthenticated = !!user && !!token;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (user) {
      localStorage.setItem('vsay-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('vsay-user');
    }

    if (token) {
      localStorage.setItem('vsay-token', token);
    } else {
      localStorage.removeItem('vsay-token');
    }

    if (sessionToken) {
      localStorage.setItem('vsay-session-token', sessionToken);
    } else {
      localStorage.removeItem('vsay-session-token');
    }

    if (availableTenants.length > 0) {
      localStorage.setItem('vsay-available-tenants', JSON.stringify(availableTenants));
    } else {
      localStorage.removeItem('vsay-available-tenants');
    }
  }, [user, token, sessionToken, availableTenants]);

  // Sync React state when api-client silently refreshes the token
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleTokenRefreshed = (e: CustomEvent<{ token: string }>) => {
      setToken(e.detail.token);
    };

    window.addEventListener('vsay-token-refreshed', handleTokenRefreshed as EventListener);
    return () => window.removeEventListener('vsay-token-refreshed', handleTokenRefreshed as EventListener);
  }, []);

  const login = (newToken: string, newUser: User, newSessionToken?: string, tenants?: TenantInfo[]) => {
    // Write to localStorage immediately so values are available when the next page
    // mounts and reads localStorage (before the useEffect sync has a chance to run).
    localStorage.setItem('vsay-token', newToken);
    localStorage.setItem('vsay-user', JSON.stringify(newUser));
    if (newSessionToken) {
      localStorage.setItem('vsay-session-token', newSessionToken);
    }
    if (tenants && tenants.length > 0) {
      localStorage.setItem('vsay-available-tenants', JSON.stringify(tenants));
    }
    setUser(newUser);
    setToken(newToken);
    if (newSessionToken) setSessionToken(newSessionToken);
    if (tenants) setAvailableTenants(tenants);
    markActivity();
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }

    // Clear localStorage immediately before the hard redirect
    localStorage.removeItem('vsay-token');
    localStorage.removeItem('vsay-user');
    localStorage.removeItem('vsay-session-token');
    localStorage.removeItem('vsay-available-tenants');
    localStorage.removeItem(ACTIVITY_STORAGE_KEY);

    setUser(null);
    setToken(null);
    setSessionToken(null);
    setAvailableTenants([]);

    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  // Auto-logout after SESSION_IDLE_TIMEOUT_MS of no user activity anywhere in
  // the app (mouse, keyboard, scroll, touch). Runs a periodic check plus an
  // immediate check on mount so a tab reopened after a long sleep also logs out.
  useEffect(() => {
    if (typeof window === 'undefined' || !isAuthenticated) return;

    const now = Date.now();
    const stored = Number(localStorage.getItem(ACTIVITY_STORAGE_KEY));
    const lastActivity = stored > 0 ? stored : now;

    if (now - lastActivity > SESSION_IDLE_TIMEOUT_MS) {
      logout();
      return;
    }

    // Establish/refresh a baseline so a freshly authenticated session (with no
    // recorded activity yet) has something real to compare future checks against.
    markActivity();

    let lastMarked = now;
    const onActivity = () => {
      const t = Date.now();
      if (t - lastMarked < ACTIVITY_THROTTLE_MS) return;
      lastMarked = t;
      markActivity();
    };

    const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const interval = setInterval(() => {
      const last = Number(localStorage.getItem(ACTIVITY_STORAGE_KEY)) || Date.now();
      if (Date.now() - last > SESSION_IDLE_TIMEOUT_MS) {
        logout();
      }
    }, IDLE_CHECK_INTERVAL_MS);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const switchTenant = async (tenantId: string) => {
    if (!sessionToken) {
      throw new Error('No active session for tenant switching');
    }

    const result = await authAPI.selectTenant({
      session_token: sessionToken,
      tenant_id: tenantId,
    });

    if ('token' in result && 'user' in result) {
      setToken(result.token);
      setUser(result.user);
      if (result.session_token) setSessionToken(result.session_token);
      if (result.available_tenants) setAvailableTenants(result.available_tenants);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, token, sessionToken, availableTenants, login, logout, switchTenant }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
