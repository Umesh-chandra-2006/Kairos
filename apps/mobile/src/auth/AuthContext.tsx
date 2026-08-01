import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { OnboardingInput, PublicUser } from "@kairos/shared";
import { api, bootstrapTokens, setAccessToken } from "../api/client";
import { clearTokens, getUser, saveUser } from "../api/storage";

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
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
      await saveUser(JSON.stringify(me));
    } catch {
      setUser(null);
      setAccessToken(null);
      await clearTokens();
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await bootstrapTokens();
      const cached = await getUser();
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as PublicUser;
          if (mounted) setUser(parsed);
        } catch {
          /* ignore corrupt cache */
        }
      }
      try {
        const { user: me } = await api.me();
        if (mounted) setUser(me);
        await saveUser(JSON.stringify(me));
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login({ email, password });
    setUser(res.user);
    await saveUser(JSON.stringify(res.user));
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.register({ name, email, password });
    setUser(res.user);
    await saveUser(JSON.stringify(res.user));
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      await clearTokens();
    }
  }, []);

  const completeOnboarding = useCallback(async (input: OnboardingInput) => {
    const { user: updated } = await api.onboarding(input);
    setUser(updated);
    await saveUser(JSON.stringify(updated));
  }, []);

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
