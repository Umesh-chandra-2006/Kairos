import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ApiError, api } from "@/api/client";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Eyebrow } from "@/components/Eyebrow";
import { MomentRing } from "@/components/MomentRing";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme";

export default function VerifyEmailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = params.token ?? "";
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!token) {
      setError("Missing or invalid verification token.");
      return;
    }
    setSubmitting(true);
    try {
      await api.verifyEmail(token);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen back title="Verify Email" withTabBar={false}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <MomentRing progress={done ? 1.0 : 0.5} size={100} symbol={done ? "✓" : "✉"} />
        </View>

        <Card style={styles.card}>
          {done ? (
            <View>
              <Eyebrow variant="teal">Success</Eyebrow>
              <Text style={[styles.message, { color: colors.text }]}>
                Your email address has been verified successfully. You are all set!
              </Text>
              <Button title="Go to Today's Challenge →" onPress={() => router.replace("/")} />
            </View>
          ) : (
            <View>
              <Eyebrow>Account Security</Eyebrow>
              <Text style={[styles.hint, { color: colors.textDim }]}>
                Confirm your email address to unlock all features and protect your account.
              </Text>
              {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
              <Button title="Verify Email Address →" onPress={onSubmit} loading={submitting} />
            </View>
          )}
        </Card>

        <Button title="Back to Home" variant="secondary" onPress={() => router.replace("/")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center" },
  hero: { alignItems: "center", marginBottom: 20 },
  card: { padding: 20, marginBottom: 16 },
  hint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginBottom: 16 },
  message: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, marginBottom: 20 },
  error: { fontFamily: fonts.body, fontSize: 13, marginBottom: 12, textAlign: "center" },
});
