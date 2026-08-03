import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "kairos.theme";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function resolve(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

interface ThemeContextValue {
  theme: Theme;
  resolved: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : "system";
  });
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolve(theme));

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setResolved(resolve(theme));
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [resolved, theme]);

  const setTheme = (next: Theme) => setThemeState(next);
  const toggle = () => setThemeState(resolved === "dark" ? "light" : "dark");

  const value = useMemo(
    () => ({ theme, resolved, setTheme, toggle }),
    [theme, resolved],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
