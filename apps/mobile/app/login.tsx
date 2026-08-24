import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Eyebrow } from "@/components/Eyebrow";
import { MomentRing } from "@/components/MomentRing";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme";

export default function LoginScreen() {
  const { user, login } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  const onSubmit = async () => {
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid credentials");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen withTabBar={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Hero */}
          <View style={styles.hero}>
            <MomentRing progress={0.75} size={110} symbol="K" />
            <Text style={[styles.brand, { color: colors.text }]}>Kairos</Text>
            <Eyebrow>Daily Interview Instrument</Eyebrow>
          </View>

          <Card style={styles.card}>
            <Field
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="you@example.com"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              placeholder="••••••••"
            />

            {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

            <Button title="Sign in →" onPress={onSubmit} loading={submitting} />

            <Link href="/forgot-password" style={[styles.forgotLink, { color: colors.textDim }]}>
              Forgot password?
            </Link>
          </Card>

          <Text style={[styles.footerText, { color: colors.textDim }]}>
            Don't have an account?{" "}
            <Link href="/register" style={[styles.registerLink, { color: colors.accent }]}>
              Create one
            </Link>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", paddingVertical: 32 },
  hero: { alignItems: "center", marginBottom: 24 },
  brand: {
    fontFamily: fonts.displayBold,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginTop: 12,
    marginBottom: 4,
  },
  card: { padding: 20 },
  error: { fontFamily: fonts.body, fontSize: 13, marginBottom: 12, textAlign: "center" },
  forgotLink: {
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
  },
  footerText: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: "center",
    marginTop: 24,
  },
  registerLink: {
    fontFamily: fonts.bodySemiBold,
    fontWeight: "600",
  },
});
