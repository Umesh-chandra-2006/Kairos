import { useRouter } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useState } from "react";
import { api } from "../lib/api";
import { Colors } from "../constants/Colors";
import {
  requestNotificationPermission,
  scheduleDailyReminder,
} from "../lib/notifications";

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

export default function OnboardingScreen() {
  const router = useRouter();
  const [role, setRole] = useState<"student" | "professional">("student");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [targets, setTargets] = useState<string[]>(["FAANG"]);
  const [notifTime, setNotifTime] = useState("09:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleTarget = (t: string) => {
    setTargets((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const onSubmit = async () => {
    if (targets.length === 0) {
      setError("Select at least one target");
      return;
    }
    setLoading(true);
    setError("");

    try {
      await api.completeOnboarding({
        role,
        level,
        targets,
        notificationTime: notifTime,
      });

      // Request notification permission and schedule
      const granted = await requestNotificationPermission();
      if (granted) {
        await scheduleDailyReminder(notifTime);
      }

      router.replace("/(tabs)");
    } catch (err: unknown) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🎯</Text>
          <Text style={styles.title}>Personalize Kairos</Text>
          <Text style={styles.subtitle}>
            We'll tailor your questions to your goals
          </Text>
        </View>

        {/* Role */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>I am a</Text>
          <View style={styles.toggleRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[styles.toggleBtn, role === r.id && styles.toggleBtnActive]}
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
        </View>

        {/* Level */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Experience Level</Text>
          <View style={styles.toggleRow}>
            {LEVELS.map((l) => (
              <TouchableOpacity
                key={l.id}
                style={[styles.toggleBtn, styles.toggleBtnSm, level === l.id && styles.toggleBtnActive]}
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
        </View>

        {/* Targets */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Target Companies</Text>
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
        </View>

        {/* Notification Time */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Daily Reminder Time</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.timeRow}>
              {TIMES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.timeChip, notifTime === t && styles.chipActive]}
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
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={onSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Let's Start →</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },

  header: { alignItems: "center", marginBottom: 40 },
  emoji: { fontSize: 52, marginBottom: 12 },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },

  section: { marginBottom: 28 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  toggleRow: { flexDirection: "row", gap: 10 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: "center",
  },
  toggleBtnSm: { flex: 1, paddingVertical: 12 },
  toggleBtnActive: {
    backgroundColor: Colors.accentDim,
    borderColor: Colors.accent,
  },
  toggleBtnText: { color: Colors.textSecondary, fontSize: 15, fontWeight: "600" },
  toggleBtnTextActive: { color: Colors.accentLight },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  chipActive: {
    backgroundColor: Colors.accentDim,
    borderColor: Colors.accent,
  },
  chipText: { color: Colors.textSecondary, fontSize: 14, fontWeight: "500" },
  chipTextActive: { color: Colors.accentLight, fontWeight: "700" },

  timeRow: { flexDirection: "row", gap: 10 },
  timeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },

  errorText: {
    color: Colors.error,
    textAlign: "center",
    marginBottom: 12,
    fontSize: 13,
  },
  submitBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
