import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { colors } from "@/theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>Kairos</Text>
          <Text style={styles.tagline}>Your daily interview prep</Text>

          <View style={styles.form}>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="Sign in" onPress={onSubmit} loading={submitting} />
            <Link href="/forgot-password" style={styles.link}>
              Forgot password?
            </Link>
          </View>

          <Text style={styles.footer}>
            New here?{" "}
            <Link href="/register" style={styles.footerLink}>
              Create an account
            </Link>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", paddingVertical: 24 },
  brand: { fontSize: 40, fontWeight: "800", textAlign: "center", color: colors.text },
  tagline: { fontSize: 16, textAlign: "center", color: colors.muted, marginTop: 4, marginBottom: 32 },
  form: { marginBottom: 24 },
  error: { color: colors.danger, marginBottom: 12, textAlign: "center" },
  link: { textAlign: "center", marginTop: 12, color: colors.muted, fontSize: 14 },
  footer: { textAlign: "center", color: colors.muted, fontSize: 14 },
  footerLink: { color: colors.text, fontWeight: "600" },
});
