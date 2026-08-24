import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Eyebrow } from "@/components/Eyebrow";
import { MomentRing } from "@/components/MomentRing";
import { useTheme } from "@/theme/ThemeContext";
import { fonts, radii } from "@/theme";
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
  const { user, completeOnboarding } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("student");
  const [level, setLevel] = useState<SkillLevel>("beginner");
  const [targets, setTargets] = useState<string[]>(["Interview prep"]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.profile) router.replace("/");
  }, [user, router]);

  const toggleTarget = (target: string) => {
    setTargets((prev) =>
      prev.includes(target) ? prev.filter((t) => t !== target) : [...prev, target]
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
      setError(err instanceof ApiError ? err.message : "Failed to save onboarding settings");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen withTabBar={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Ring Hero */}
        <View style={styles.hero}>
          <MomentRing progress={0.5} size={110} symbol="⚙" />
          <Text style={[styles.title, { color: colors.text }]}>Personalize Kairos</Text>
          <Eyebrow>Setup Profile</Eyebrow>
        </View>

        {/* Form Card */}
        <Card style={styles.card}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>I am a…</Text>
          <View style={styles.chipRow}>
            {ROLES.map((r) => (
              <Chip
                key={r.value}
                label={r.label}
                selected={role === r.value}
                colors={colors}
                onPress={() => setRole(r.value)}
              />
            ))}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>Experience level</Text>
          <View style={styles.chipRow}>
            {LEVELS.map((l) => (
              <Chip
                key={l.value}
                label={l.label}
                selected={level === l.value}
                colors={colors}
                onPress={() => setLevel(l.value)}
              />
            ))}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>Target focus</Text>
          <View style={styles.wrapRow}>
            {TARGETS.map((t) => (
              <Chip
                key={t}
                label={t}
                selected={targets.includes(t)}
                colors={colors}
                onPress={() => toggleTarget(t)}
              />
            ))}
          </View>

          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

          <Button title="Complete Setup →" onPress={onSubmit} loading={submitting} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Chip({
  label,
  selected,
  colors,
  onPress,
}: {
  label: string;
  selected: boolean;
  colors: any;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: selected ? colors.accent : colors.line,
          backgroundColor: selected ? `${colors.accent}18` : colors.surface2,
        },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text
        style={[
          styles.chipLabel,
          {
            color: selected ? colors.accent : colors.textDim,
            fontFamily: selected ? fonts.bodySemiBold : fonts.body,
          },
        ]}
      >
        {selected ? `✓ ${label}` : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 },
  hero: { alignItems: "center", marginBottom: 20 },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginTop: 12,
    marginBottom: 4,
  },
  card: { padding: 20 },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
    marginTop: 4,
  },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 20, flexWrap: "wrap" },
  wrapRow: { flexDirection: "row", gap: 8, marginBottom: 24, flexWrap: "wrap" },
  chip: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipLabel: { fontSize: 13 },
  error: { fontFamily: fonts.body, fontSize: 13, marginBottom: 12, textAlign: "center" },
});
