import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { colors } from "@/theme";

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
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
          <Text style={styles.title}>Create account</Text>

          <View style={styles.form}>
            <Field label="Name" value={name} onChangeText={setName} autoComplete="name" />
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
              autoComplete="new-password"
              error={
                password && password.length > 0 && password.length < 8
                  ? "At least 8 characters with upper, lower and a number"
                  : undefined
              }
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="Create account" onPress={onSubmit} loading={submitting} />
          </View>

          <Text style={styles.footer}>
            Already have an account?{" "}
            <Link href="/login" style={styles.footerLink}>
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
  scroll: { flexGrow: 1, justifyContent: "center", paddingVertical: 24 },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 24, color: colors.text },
  form: { marginBottom: 24 },
  error: { color: colors.danger, marginBottom: 12, textAlign: "center" },
  footer: { textAlign: "center", color: colors.muted, fontSize: 14 },
  footerLink: { color: colors.text, fontWeight: "600" },
});
