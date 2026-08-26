import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { OnboardingInput, PublicUser } from "@kairos/shared";
import { api, getAccessToken, restoreSession, setAccessToken, unregisterWebPush } from "../api/client";

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, referralCode?: string, turnstileToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: (input: OnboardingInput) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { user: me } = await api.me();
      setUser(me);
    } catch {
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    void restoreSession()
      .then((session) => {
        if (mounted) setUser(session ? session.user : null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login({ email, password });
      setAccessToken(res.accessToken);
      setUser(res.user);
    },
    [],
  );

  const register = useCallback(
    async (name: string, email: string, password: string, referralCode?: string, turnstileToken?: string) => {
      const res = await api.register({ name, email, password, referralCode, turnstileToken });
      setAccessToken(res.accessToken);
      setUser(res.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await unregisterWebPush();
    } catch {
      /* best effort */
    }
    try {
      await api.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const completeOnboarding = useCallback(
    async (input: OnboardingInput) => {
      const { user: updated } = await api.onboarding(input);
      setUser(updated);
    },
    [],
  );

  const value = useMemo(
    () => ({ user, loading, login, register, logout, completeOnboarding, refreshUser }),
    [user, loading, login, register, logout, completeOnboarding, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}
