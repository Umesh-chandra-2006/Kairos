import { useCallback, useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import * as Notifications from "expo-notifications";
import { useAuth } from "@/auth/AuthContext";
import { ApiError, api } from "@/api/client";
import { getExpoPushToken, setExpoPushToken } from "@/api/storage";
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

  const [pushStatus, setPushStatus] = useState<"loading" | "enabled" | "disabled">("loading");
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [subs, token] = await Promise.all([api.pushSubscriptions(), getExpoPushToken()]);
        if (cancelled) return;
        setPushStatus(token && subs.subscriptions.some((s) => s.channel === "expo" && s.token === token) ? "enabled" : "disabled");
      } catch {
        if (!cancelled) {
          setPushStatus("disabled");
          setPushMessage("Could not check your push status.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const enablePush = useCallback(async () => {
    setPushBusy(true);
    setPushMessage(null);
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
      const current = await Notifications.getPermissionsAsync();
      let granted = current.status === "granted";
      if (!granted) {
        const requested = await Notifications.requestPermissionsAsync();
        granted = requested.status === "granted";
      }
      if (!granted) {
        setPushMessage("Notifications are blocked. Enable them in your device settings.");
        return;
      }
      let token: string;
      try {
        const pushToken = await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
        });
        token = pushToken.data;
      } catch {
        setPushMessage("Expo push needs a project ID. Set EXPO_PUBLIC_EAS_PROJECT_ID in your environment.");
        return;
      }
      await api.subscribePush(token);
      await setExpoPushToken(token);
      setPushStatus("enabled");
    } catch (err) {
      setPushMessage(err instanceof ApiError ? err.message : "Could not enable push notifications");
    } finally {
      setPushBusy(false);
    }
  }, []);

  const disablePush = useCallback(async () => {
    setPushBusy(true);
    setPushMessage(null);
    try {
      const token = await getExpoPushToken();
      if (token) {
        try {
          await api.unsubscribePush(token);
        } catch {
          /* keep going */
        }
      }
      setPushStatus("disabled");
    } catch (err) {
      setPushMessage(err instanceof ApiError ? err.message : "Could not disable push notifications");
    } finally {
      setPushBusy(false);
    }
  }, []);

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

      <Text style={styles.section}>Push notifications</Text>
      {pushStatus === "enabled" ? (
        <>
          <Text style={styles.muted}>Push notifications are on for this device.</Text>
          <Button title="Turn off push" onPress={disablePush} loading={pushBusy} variant="ghost" />
        </>
      ) : (
        <>
          <Text style={styles.muted}>Get notified when an answer is evaluated and for daily streak reminders.</Text>
          <Button title="Enable push notifications" onPress={enablePush} loading={pushBusy} />
        </>
      )}
      {pushMessage ? (
        <Text style={pushMessage.includes("blocked") || pushMessage.includes("needs a project ID") ? styles.error : styles.message}>
          {pushMessage}
        </Text>
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
