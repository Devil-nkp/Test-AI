'use client';
/**
 * PrepVista AI — Auth Context Provider
 * Global authentication state management.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, ApiUser } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from '@/lib/supabase-browser';

export type User = ApiUser;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  googleEnabled: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const googleEnabled = hasSupabaseBrowserConfig();

  const hydrateFromSupabase = useCallback(async () => {
    if (api.getToken() || !googleEnabled) {
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (session?.access_token && session.refresh_token) {
        api.setTokens(session.access_token, session.refresh_token);
      }
    } catch {
      // Ignore optional browser session hydration issues.
    }
  }, [googleEnabled]);

  const refreshUser = useCallback(async () => {
    try {
      api.loadTokens();
      await hydrateFromSupabase();
      if (!api.getToken()) {
        setUser(null);
        setLoading(false);
        return;
      }
      const data = await api.getMe<User>();
      setUser(data);
    } catch {
      setUser(null);
      api.clearTokens();
    } finally {
      setLoading(false);
    }
  }, [hydrateFromSupabase]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    await api.login(email, password);
    await refreshUser();
    router.push('/dashboard');
  };

  const signup = async (email: string, password: string, fullName: string) => {
    await api.signup(email, password, fullName);
    await refreshUser();
    router.push('/dashboard');
  };

  const loginWithGoogle = async () => {
    if (!googleEnabled) {
      throw new Error('Google sign-in is not configured yet.');
    }

    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      throw error;
    }

    if (data.url) {
      window.location.assign(data.url);
    }
  };

  const logout = async () => {
    api.logout();
    if (googleEnabled) {
      try {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
      } catch {
        // Ignore sign-out issues from the optional browser client.
      }
    }
    setUser(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithGoogle, logout, refreshUser, googleEnabled }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
