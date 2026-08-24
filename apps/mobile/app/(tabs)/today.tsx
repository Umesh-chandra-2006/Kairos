import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { api, ApiError } from "@/api/client";
import { Screen } from "@/components/Screen";
import { MomentRing } from "@/components/MomentRing";
import { Card } from "@/components/Card";
import { Eyebrow } from "@/components/Eyebrow";
import { Pill } from "@/components/Pill";
import { Button } from "@/components/Button";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme";
import type { TodayQuestionResponse } from "@kairos/shared";

const CATEGORY_EMOJI: Record<string, string> = {
  logic: "⬡",
  verbal: "◈",
  numerical: "∑",
  spatial: "⬡",
  memory: "◎",
  "pattern-recognition": "◈",
  default: "◉",
};

export default function TodayScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [today, setToday] = useState<TodayQuestionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Countdown to midnight
  const [secondsLeft, setSecondsLeft] = useState(0);

  const loadToday = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.today();
      setToday(res);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load today's question"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  // Countdown timer
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      setSecondsLeft(Math.floor((midnight.getTime() - now.getTime()) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const formatCountdown = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  // Ring progress: fraction of day elapsed
  const dayProgress = (() => {
    const now = new Date();
    return (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
  })();

  const q = today?.question;
  const emoji = q ? (CATEGORY_EMOJI[q.category?.toLowerCase()] ?? CATEGORY_EMOJI.default) : "◉";

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ring ── */}
        <View style={styles.hero}>
          <MomentRing
            progress={dayProgress}
            size={200}
            symbol={emoji}
            answered={today?.alreadyAnswered}
          />
          <Text style={[styles.countdown, { color: colors.textDim }]}>
            {formatCountdown(secondsLeft)}
          </Text>
          <Text style={[styles.countdownLabel, { color: colors.textDim }]}>
            REMAINING TODAY
          </Text>
        </View>

        {error ? (
          <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
        ) : null}

        {!q ? (
          <Card center>
            <Text style={[styles.muted, { color: colors.textDim }]}>
              No question assigned for today yet.
            </Text>
          </Card>
        ) : today?.alreadyAnswered ? (
          /* ── Already answered state ── */
          <Card>
            <Eyebrow>{q.category}</Eyebrow>
            <Text style={[styles.questionText, { color: colors.text }]}>
              {q.text}
            </Text>
            <View style={styles.pillRow}>
              <Pill icon="✓">Submitted</Pill>
            </View>
            <Button
              title="View in history"
              variant="secondary"
              onPress={() => router.push("/(tabs)/history")}
            />
          </Card>
        ) : (
          /* ── Active question card ── */
          <Card>
            <Eyebrow>{q.category}</Eyebrow>
            <Text style={[styles.questionText, { color: colors.text }]}>
              {q.text}
            </Text>
            {q.rubricHints ? (
              <Text style={[styles.hint, { color: colors.textDim }]}>
                {q.rubricHints}
              </Text>
            ) : null}

            <Button
              title="Write your answer →"
              onPress={() =>
                router.push({
                  pathname: "/answer",
                  params: { questionId: q.id, questionText: q.text, category: q.category },
                })
              }
            />
          </Card>
        )}

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          <StatBox label="Streak" value="—" unit="days" colors={colors} />
          <StatBox label="Avg score" value="—" unit="/10" colors={colors} />
          <StatBox label="Total" value="—" unit="answered" colors={colors} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function StatBox({
  label,
  value,
  unit,
  colors,
}: {
  label: string;
  value: string | number;
  unit: string;
  colors: any;
}) {
  return (
    <View
      style={[
        styles.statBox,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statUnit, { color: colors.textDim }]}>{unit}</Text>
      <Text style={[styles.statLabel, { color: colors.textDim }]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: { alignItems: "center", paddingVertical: 24 },
  countdown: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 26,
    letterSpacing: 2,
    marginTop: 16,
  },
  countdownLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  questionText: {
    fontFamily: fonts.sans,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 26,
    marginBottom: 12,
  },
  hint: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  pillRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  muted: { fontFamily: fonts.sans, fontSize: 14, textAlign: "center" },
  error: { fontFamily: fonts.sans, fontSize: 14, marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  statValue: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 22,
    fontWeight: "700",
  },
  statUnit: { fontFamily: fonts.mono, fontSize: 10, marginTop: 1 },
  statLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 4,
  },
});
