import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { ApiError, api } from "@/api/client";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Eyebrow } from "@/components/Eyebrow";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme";

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen back title="Forgot Password" withTabBar={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Card style={styles.card}>
            {sent ? (
              <View>
                <Eyebrow variant="teal">Email Sent</Eyebrow>
                <Text style={[styles.message, { color: colors.text }]}>
                  If an account exists for {email.trim()}, a password reset link has been sent. Please check your inbox.
                </Text>
                <Button
                  title="Back to Sign In"
                  variant="secondary"
                  onPress={() => router.replace("/login")}
                />
              </View>
            ) : (
              <>
                <Eyebrow>Account Recovery</Eyebrow>
                <Text style={[styles.hint, { color: colors.textDim }]}>
                  Enter your email address below and we will send you instructions to reset your password.
                </Text>
                <Field
                  label="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  placeholder="you@example.com"
                />
                {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
                <Button title="Send reset link →" onPress={onSubmit} loading={submitting} />
              </>
            )}
          </Card>

          <Link href="/login" style={[styles.backLink, { color: colors.textDim }]}>
            ← Back to sign in
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingTop: 12 },
  card: { padding: 20 },
  hint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginBottom: 16 },
  message: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginBottom: 20 },
  error: { fontFamily: fonts.body, fontSize: 13, marginBottom: 12, textAlign: "center" },
  backLink: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: "center",
    marginTop: 20,
  },
});
