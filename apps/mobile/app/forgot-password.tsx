import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { ApiError, api } from "@/api/client";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { colors } from "@/theme";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
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
          <Text style={styles.title}>Reset password</Text>

          {sent ? (
            <View>
              <Text style={styles.message}>
                If an account exists for {email.trim()}, a reset link has been sent. Check your inbox.
              </Text>
              <Button title="Back to sign in" onPress={() => router.replace("/login")} />
            </View>
          ) : (
            <>
              <Text style={styles.hint}>
                Enter your email and we'll send you a link to reset your password.
              </Text>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button title="Send reset link" onPress={onSubmit} loading={submitting} />
            </>
          )}

          <Link href="/login" style={styles.link}>
            Back to sign in
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", paddingVertical: 24 },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 12, color: colors.text },
  hint: { fontSize: 14, color: colors.muted, textAlign: "center", marginBottom: 20 },
  message: { fontSize: 15, color: colors.text, textAlign: "center", marginBottom: 20 },
  error: { color: colors.danger, marginBottom: 12, textAlign: "center" },
  link: { textAlign: "center", marginTop: 16, color: colors.muted, fontSize: 14 },
});
