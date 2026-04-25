import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { api, StreakInfo, User, Answer } from "../../lib/api";
import { Colors } from "../../constants/Colors";
import { scheduleDailyReminder } from "../../lib/notifications";

const ROLES = [
  { id: "student", label: "Student" },
  { id: "professional", label: "Professional" },
];
const LEVELS = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];
const TARGETS = ["FAANG", "Product", "Service", "Startup"];
const TIMES = ["07:00", "08:00", "09:00", "10:00", "12:00", "18:00", "20:00"];

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user: clerkUser } = useUser();
  const router = useRouter();

  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Editable prefs
  const [role, setRole] = useState<"student" | "professional">("student");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [targets, setTargets] = useState<string[]>([]);
  const [notifTime, setNotifTime] = useState("09:00");
  const [saving, setSaving] = useState(false);
  const [freezing, setFreezing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [streakRes, historyRes] = await Promise.all([
        api.getStreak(),
        api.getHistory(),
      ]);
      setStreak(streakRes);

      const answers = historyRes.answers as Answer[];
      setTotalAnswered(answers.length);
      if (answers.length > 0) {
        const avg =
          answers.reduce((sum, a) => sum + a.score, 0) / answers.length;
        setAvgScore(Math.round(avg * 10) / 10);
      }
    } catch {
      // Silent fail — stats just won't show
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Initialise editable fields from Clerk user metadata (best-effort)
  // In a full implementation you'd fetch profile from /api/auth/sync
  const onSavePrefs = async () => {
    setSaving(true);
    try {
      await api.completeOnboarding({ role, level, targets, notificationTime: notifTime });
      await scheduleDailyReminder(notifTime);
      Alert.alert("Saved", "Your preferences have been updated.");
    } catch {
      Alert.alert("Error", "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  const onUseFreeze = async () => {
    if (!streak || streak.freezesRemaining < 1) return;
    setFreezing(true);
    try {
      const res = await api.useFreeze();
      setStreak(res.streak);
      Alert.alert("Freeze used! ❄️", "Today counts as active — your streak is safe.");
    } catch (err: unknown) {
      const e = err as Error;
      Alert.alert("Error", e.message || "Could not use freeze.");
    } finally {
      setFreezing(false);
    }
  };

  const onSignOut = async () => {
    await signOut();
    router.replace("/(auth)/sign-in");
  };

  const toggleTarget = (t: string) => {
    setTargets((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Profile</Text>
        </View>

        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>
              {clerkUser?.firstName?.charAt(0) || "U"}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>
              {clerkUser?.fullName || clerkUser?.firstName || "User"}
            </Text>
            <Text style={styles.userEmail}>
              {clerkUser?.emailAddresses[0]?.emailAddress}
            </Text>
          </View>
        </View>

        {/* Stats */}
        {loading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.statsRow}>
            <StatBox label="Streak" value={`${streak?.current ?? 0}`} emoji="🔥" />
            <StatBox label="Best" value={`${streak?.longest ?? 0}`} emoji="🏆" />
            <StatBox label="Answered" value={`${totalAnswered}`} emoji="✅" />
            <StatBox
              label="Avg Score"
              value={avgScore !== null ? `${avgScore}` : "—"}
              emoji="⭐"
            />
          </View>
        )}

        {/* Streak Freeze */}
        {streak && streak.current > 0 && (
          <View style={styles.freezeCard}>
            <View>
              <Text style={styles.freezeTitle}>Streak Freeze ❄️</Text>
              <Text style={styles.freezeSubtitle}>
                {streak.freezesRemaining > 0
                  ? "1 freeze available"
                  : "No freezes remaining — refills Monday"}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.freezeBtn,
                streak.freezesRemaining < 1 && styles.freezeBtnDisabled,
              ]}
              onPress={onUseFreeze}
              disabled={streak.freezesRemaining < 1 || freezing}
            >
              {freezing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.freezeBtnText}>Use</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Preferences */}
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.prefCard}>
          <Text style={styles.prefLabel}>I AM A</Text>
          <View style={styles.toggleRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[
                  styles.toggleBtn,
                  role === r.id && styles.toggleBtnActive,
                ]}
                onPress={() => setRole(r.id as typeof role)}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    role === r.id && styles.toggleBtnTextActive,
                  ]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.prefLabel, { marginTop: 16 }]}>LEVEL</Text>
          <View style={styles.toggleRow}>
            {LEVELS.map((l) => (
              <TouchableOpacity
                key={l.id}
                style={[
                  styles.toggleBtn,
                  level === l.id && styles.toggleBtnActive,
                ]}
                onPress={() => setLevel(l.id as typeof level)}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    level === l.id && styles.toggleBtnTextActive,
                  ]}
                >
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.prefLabel, { marginTop: 16 }]}>TARGETS</Text>
          <View style={styles.chipRow}>
            {TARGETS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, targets.includes(t) && styles.chipActive]}
                onPress={() => toggleTarget(t)}
              >
                <Text
                  style={[
                    styles.chipText,
                    targets.includes(t) && styles.chipTextActive,
                  ]}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.prefLabel, { marginTop: 16 }]}>
            DAILY REMINDER
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.timeRow}>
              {TIMES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.chip,
                    notifTime === t && styles.chipActive,
                  ]}
                  onPress={() => setNotifTime(t)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      notifTime === t && styles.chipTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={onSavePrefs}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save Preferences</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={onSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function StatBox({
  label,
  value,
  emoji,
}: {
  label: string;
  value: string;
  emoji: string;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 48 },

  pageHeader: { marginBottom: 20 },
  pageTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },

  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.accentDim,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  avatarInitial: { fontSize: 22, fontWeight: "800", color: Colors.accentLight },
  userName: { fontSize: 17, fontWeight: "700", color: Colors.textPrimary },
  userEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  statEmoji: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: "800", color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2, textTransform: "uppercase" },

  freezeCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  freezeTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  freezeSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  freezeBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 48,
    alignItems: "center",
  },
  freezeBtnDisabled: { opacity: 0.4 },
  freezeBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  prefCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: 16,
  },
  prefLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  toggleRow: { flexDirection: "row", gap: 8 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: "center",
  },
  toggleBtnActive: { backgroundColor: Colors.accentDim, borderColor: Colors.accent },
  toggleBtnText: { color: Colors.textSecondary, fontSize: 13, fontWeight: "600" },
  toggleBtnTextActive: { color: Colors.accentLight },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  chipActive: { backgroundColor: Colors.accentDim, borderColor: Colors.accent },
  chipText: { color: Colors.textSecondary, fontSize: 13 },
  chipTextActive: { color: Colors.accentLight, fontWeight: "700" },
  timeRow: { flexDirection: "row", gap: 8 },

  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  signOutBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.error + "40",
    marginTop: 4,
  },
  signOutText: { color: Colors.error, fontWeight: "700", fontSize: 15 },
});
