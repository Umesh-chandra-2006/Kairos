import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ApiError, api } from "@/api/client";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Eyebrow } from "@/components/Eyebrow";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme";

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = params.token ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!token) {
      setError("Missing or invalid reset token.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.resetPassword(token, password);
      router.replace("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Password reset failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen back title="Set New Password" withTabBar={false}>
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
            <Eyebrow>Security</Eyebrow>
            <Text style={[styles.hint, { color: colors.textDim }]}>
              Please enter your new password below. It must be at least 8 characters.
            </Text>

            <Field
              label="New Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              placeholder="••••••••"
            />

            {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

            <Button title="Update Password →" onPress={onSubmit} loading={submitting} />
          </Card>
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
  error: { fontFamily: fonts.body, fontSize: 13, marginBottom: 12, textAlign: "center" },
});
