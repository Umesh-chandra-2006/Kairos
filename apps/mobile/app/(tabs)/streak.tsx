import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { api, ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { colors } from "@/theme";
import type { Streak } from "@kairos/shared";

type StreakWithRank = Streak & { rank: number | null };

interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  answered: number;
  avgScore: number | null;
  weakestCategory: string | null;
}

export default function StreakScreen() {
  const [streak, setStreak] = useState<StreakWithRank | null>(null);
  const [weekly, setWeekly] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refilling, setRefilling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.streak();
      setStreak(res.streak);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load streak");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    api
      .weeklySummary()
      .then(({ summary }) => setWeekly(summary))
      .catch(() => {
        /* non-critical */
      });
  }, [load]);

  const refill = async () => {
    setRefilling(true);
    setError(null);
    try {
      const res = await api.refillFreezes();
      setStreak({ ...res.streak, rank: streak?.rank ?? null });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Refill failed");
    } finally {
      setRefilling(false);
    }
  };

  if (loading) {
    return (
      <Screen title="Streak">
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  if (!streak) {
    return (
      <Screen title="Streak">
        <Text style={styles.error}>{error ?? "No streak data"}</Text>
      </Screen>
    );
  }

  return (
    <Screen title="Streak">
      <View style={styles.cards}>
        <Stat label="Current streak" value={streak.current} />
        <Stat label="Longest streak" value={streak.longest} />
        <Stat label="Freezes remaining" value={streak.freezesRemaining} />
      </View>
      {streak.rank !== null && streak.rank !== undefined ? (
        <Text style={styles.rank}>Your rank: #{streak.rank}</Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Refill freezes" onPress={refill} loading={refilling} variant="ghost" />

      {weekly ? (
        <View style={styles.weekCard}>
          <Text style={styles.weekTitle}>Last week</Text>
          {weekly.answered > 0 ? (
            <>
              <View style={styles.cards}>
                <Stat label="Answered" value={weekly.answered} />
                <Stat label="Avg score" value={weekly.avgScore ?? "–"} />
              </View>
              <Text style={styles.weekNote}>
                {weekly.weakestCategory
                  ? `Weakest area: ${weekly.weakestCategory}`
                  : "No scored answers yet — the evaluation AI needs a key to score."}
              </Text>
            </>
          ) : (
            <Text style={styles.weekNote}>You didn't answer any daily questions last week. A fresh week starts today.</Text>
          )}
        </View>
      ) : null}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cards: { flexDirection: "row", gap: 10, marginBottom: 16 },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  statValue: { fontSize: 28, fontWeight: "800", color: colors.primary },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 4, textAlign: "center" },
  rank: { fontSize: 15, color: colors.text, marginBottom: 12 },
  error: { color: colors.danger, marginBottom: 12 },
  weekCard: {
    marginTop: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
  },
  weekTitle: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 12 },
  weekNote: { fontSize: 13, color: colors.muted, marginTop: 12, lineHeight: 18 },
});
