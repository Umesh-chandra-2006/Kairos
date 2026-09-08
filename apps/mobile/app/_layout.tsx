import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
// import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import {
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  useFonts as usePlayfair,
} from "@expo-google-fonts/playfair-display";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts as useInter,
} from "@expo-google-fonts/inter";
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
  useFonts as useIBMPlex,
} from "@expo-google-fonts/ibm-plex-mono";
import { AuthProvider } from "@/auth/AuthContext";
import { ThemeProvider, useTheme } from "@/theme/ThemeContext";

const BEACON_URL = "http://192.168.0.116:8080/beacon";
function beacon(tag: string, extra?: string) {
  try {
    const url =
      BEACON_URL +
      "?e=" +
      encodeURIComponent(tag) +
      (extra ? "&s=" + encodeURIComponent(String(extra)).slice(0, 800) : "");
    fetch(url, { method: "POST", keepalive: true }).catch(() => {});
  } catch {}
}

const errorUtils = (globalThis as any).ErrorUtils;
if (errorUtils && typeof errorUtils.setGlobalHandler === "function") {
  const prev = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    beacon("js-error", ((error as Error)?.message || String(error)) + " fatal=" + !!isFatal);
    if (prev) prev(error, isFatal);
  });
}

beacon("boot-layout");

SplashScreen.preventAutoHideAsync();

// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowBanner: true,
//     shouldShowList: true,
//     shouldPlaySound: true,
//     shouldSetBadge: false,
//   }),
// });

function RootLayoutInner() {
  const { isDark } = useTheme();

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });
  const [interLoaded] = useInter({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [monoLoaded] = useIBMPlex({
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  const fontsLoaded = playfairLoaded && interLoaded && monoLoaded;

  useEffect(() => {
    if (fontsLoaded) {
      beacon("fonts-loaded");
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="verify-email" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="answer" />
        <Stack.Screen name="evaluation" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutInner />
      </AuthProvider>
    </ThemeProvider>
  );
}
