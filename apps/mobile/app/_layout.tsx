import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { api, setTokenGetter } from "../lib/api";
import { Colors } from "../constants/Colors";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

function RootLayoutNav() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const segments = useSegments();
  const [syncing, setSyncing] = useState(false);

  // Set the token getter for the API client
  useEffect(() => {
    setTokenGetter(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (isSignedIn && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isLoaded, isSignedIn, segments]);

  // Sync user to our DB after sign-in
  useEffect(() => {
    if (!isSignedIn || !user || syncing) return;

    const syncUser = async () => {
      setSyncing(true);
      try {
        const primaryEmail = user.emailAddresses[0]?.emailAddress || "";
        const result = await api.syncUser({
          name: user.fullName || user.firstName || "User",
          email: primaryEmail,
        });

        // If no profile set yet, redirect to onboarding
        if (!result.user.profile.role) {
          router.replace("/onboarding");
        }
      } catch (err) {
        console.error("User sync failed:", err);
      } finally {
        setSyncing(false);
      }
    };

    syncUser();
  }, [isSignedIn, user]);

  if (!isLoaded || syncing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <RootLayoutNav />
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
