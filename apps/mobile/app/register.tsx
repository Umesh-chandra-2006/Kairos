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

export default function RegisterScreen() {
  const { user, register } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) router.replace("/onboarding");
  }, [user, router]);

  const onSubmit = async () => {
    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
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
            <MomentRing progress={1.0} size={100} symbol="+" />
            <Text style={[styles.brand, { color: colors.text }]}>Create Account</Text>
            <Eyebrow>Join Kairos</Eyebrow>
          </View>

          <Card style={styles.card}>
            <Field
              label="Full Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              placeholder="Alex Chen"
            />
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
              placeholder="At least 8 characters"
            />

            {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

            <Button title="Create Account →" onPress={onSubmit} loading={submitting} />
          </Card>

          <Text style={[styles.footerText, { color: colors.textDim }]}>
            Already have an account?{" "}
            <Link href="/login" style={[styles.loginLink, { color: colors.accent }]}>
              Sign in
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
  hero: { alignItems: "center", marginBottom: 20 },
  brand: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginTop: 12,
    marginBottom: 4,
  },
  card: { padding: 20 },
  error: { fontFamily: fonts.body, fontSize: 13, marginBottom: 12, textAlign: "center" },
  footerText: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: "center",
    marginTop: 24,
  },
  loginLink: {
    fontFamily: fonts.bodySemiBold,
    fontWeight: "600",
  },
});
