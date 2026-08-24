import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { getItemAsync, setItemAsync } from "expo-secure-store";
import { darkColors, lightColors, type ColorPalette } from "../theme";

type ThemeMode = "dark" | "light" | "system";

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ColorPalette;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "kairos_theme_mode";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  // Load persisted preference on mount
  useEffect(() => {
    getItemAsync(STORAGE_KEY)
      .then((val) => {
        if (val === "dark" || val === "light" || val === "system") {
          setModeState(val);
        }
      })
      .catch(() => {/* default to system */});
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    setItemAsync(STORAGE_KEY, newMode).catch(() => {});
  }, []);

  const isDark = mode === "system" ? systemScheme === "dark" : mode === "dark";
  const colors: ColorPalette = isDark ? darkColors : lightColors;

  const value = useMemo(
    () => ({ mode, colors, isDark, setMode }),
    [mode, colors, isDark, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
