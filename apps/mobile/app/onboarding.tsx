import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { colors, radius } from "@/theme";
import type { SkillLevel, UserRole } from "@kairos/shared";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "professional", label: "Professional" },
];

const LEVELS: { value: SkillLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const TARGETS = ["Interview prep", "Coding challenges", "System design", "Behavioral rounds"];

export default function OnboardingScreen() {
  const { completeOnboarding } = useAuth();
  const [role, setRole] = useState<UserRole>("student");
  const [level, setLevel] = useState<SkillLevel>("beginner");
  const [targets, setTargets] = useState<string[]>(["Interview prep"]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggleTarget = (target: string) => {
    setTargets((prev) =>
      prev.includes(target) ? prev.filter((t) => t !== target) : [...prev, target],
    );
  };

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await completeOnboarding({
        role,
        level,
        targets,
        notificationTime: "09:00",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  return (
    <Screen title="Let's personalize Kairos">
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>I am a…</Text>
        <View style={styles.row}>
          {ROLES.map((r) => (
            <Choice key={r.value} label={r.label} selected={role === r.value} onPress={() => setRole(r.value)} />
          ))}
        </View>

        <Text style={styles.sectionLabel}>My experience level</Text>
        <View style={styles.row}>
          {LEVELS.map((l) => (
            <Choice
              key={l.value}
              label={l.label}
              selected={level === l.value}
              onPress={() => setLevel(l.value)}
            />
          ))}
        </View>

        <Text style={styles.sectionLabel}>What I'm preparing for</Text>
        <View style={styles.wrapRow}>
          {TARGETS.map((t) => (
            <Choice
              key={t}
              label={t}
              selected={targets.includes(t)}
              onPress={() => toggleTarget(t)}
            />
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Get started" onPress={onSubmit} loading={submitting} />
      </ScrollView>
    </Screen>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Button title={label} onPress={onPress} variant={selected ? "primary" : "ghost"} />
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 24 },
  sectionLabel: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 10, marginTop: 8 },
  row: { flexDirection: "row", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  wrapRow: { flexDirection: "row", gap: 8, marginBottom: 24, flexWrap: "wrap" },
  error: { color: colors.danger, marginBottom: 12, textAlign: "center" },
});
