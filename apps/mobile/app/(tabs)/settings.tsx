import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { ApiError, api } from "@/api/client";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { colors } from "@/theme";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const changePassword = async () => {
    setError(null);
    setMessage(null);
    if (!currentPassword || !newPassword) {
      setError("Fill in both password fields");
      return;
    }
    setSubmitting(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Password updated. You'll need to sign in again.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to change password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen title="Settings">
      {user ? (
        <View style={styles.card}>
          <Text style={styles.name}>{user.name ?? "User"}</Text>
          <Text style={styles.muted}>{user.email}</Text>
          {user.emailVerified ? (
            <Text style={styles.verified}>Email verified</Text>
          ) : (
            <Text style={styles.unverified}>Email not verified</Text>
          )}
        </View>
      ) : null}

      <Text style={styles.section}>Change password</Text>
      <Field
        label="Current password"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        autoComplete="current-password"
      />
      <Field
        label="New password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        autoComplete="new-password"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Button title="Change password" onPress={changePassword} loading={submitting} variant="ghost" />

      <View style={styles.spacer} />
      <Button title="Sign out" onPress={logout} variant="danger" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  name: { fontSize: 18, fontWeight: "700", color: colors.text },
  muted: { color: colors.muted, marginTop: 2 },
  verified: { color: colors.success, marginTop: 4, fontSize: 13 },
  unverified: { color: colors.accent, marginTop: 4, fontSize: 13 },
  section: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 10 },
  error: { color: colors.danger, marginBottom: 12 },
  message: { color: colors.success, marginBottom: 12 },
  spacer: { marginTop: 24 },
});
