import { useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { useTheme } from "@/theme/ThemeContext";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Eyebrow } from "@/components/Eyebrow";
import { Button } from "@/components/Button";
import { fonts } from "@/theme";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { mode, setMode, colors } = useTheme();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          try {
            await logout();
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const isDarkMode = mode === "dark";

  const toggleTheme = (val: boolean) => {
    setMode(val ? "dark" : "light");
  };

  return (
    <Screen title="Profile">
      {/* User Info Header Card */}
      <Card>
        <Eyebrow>Account Overview</Eyebrow>
        <View style={styles.userHeader}>
          <View style={[styles.avatar, { backgroundColor: `${colors.accent}20`, borderColor: colors.accent }]}>
            <Text style={[styles.avatarText, { color: colors.accent }]}>
              {(user?.name ?? "U").slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.name ?? "Developer"}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textDim }]}>
              {user?.email ?? "user@example.com"}
            </Text>
          </View>
        </View>

        {user?.profile?.role ? (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textDim }]}>Role:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{user.profile.role}</Text>
          </View>
        ) : null}
      </Card>

      {/* Preferences / Settings Card */}
      <Card>
        <Eyebrow>Preferences</Eyebrow>
        <View style={styles.settingRow}>
          <View style={styles.settingTextGroup}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>Dark Mode</Text>
            <Text style={[styles.settingSubtitle, { color: colors.textDim }]}>
              {isDarkMode ? "Sleek dark theme active" : "Light mode active"}
            </Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.line, true: colors.accent }}
            thumbColor={isDarkMode ? colors.accentInk : colors.surface}
          />
        </View>
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Sign Out"
          variant="danger"
          loading={loggingOut}
          onPress={handleLogout}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginVertical: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 20,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    fontWeight: "700",
  },
  userEmail: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  detailLabel: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 12,
  },
  detailValue: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    textTransform: "capitalize",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  settingTextGroup: {
    flex: 1,
    paddingRight: 16,
  },
  settingTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    fontWeight: "600",
  },
  settingSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    marginTop: 12,
  },
});
