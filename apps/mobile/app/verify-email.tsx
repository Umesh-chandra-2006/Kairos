import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ApiError, api } from "@/api/client";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { colors } from "@/theme";

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = params.token ?? "";
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!token) {
      setError("Missing verification token");
      return;
    }
    setSubmitting(true);
    try {
      await api.verifyEmail(token);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.wrap}>
        <Text style={styles.title}>Verify your email</Text>
        {done ? (
          <Text style={styles.message}>Your email is verified. You're all set!</Text>
        ) : (
          <>
            <Text style={styles.hint}>Confirm your email address to keep your account secure.</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="Verify email" onPress={onSubmit} loading={submitting} />
          </>
        )}
        <View style={styles.spacer} />
        <Button title="Go home" onPress={() => router.replace("/")} variant="ghost" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 12, color: colors.text },
  hint: { fontSize: 14, color: colors.muted, textAlign: "center", marginBottom: 20 },
  message: { fontSize: 15, color: colors.text, textAlign: "center", marginBottom: 20 },
  error: { color: colors.danger, marginBottom: 12, textAlign: "center" },
  spacer: { marginTop: 8 },
});
