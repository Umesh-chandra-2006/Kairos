import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { api, ApiError } from "@/api/client";
import { Screen } from "@/components/Screen";
import { colors } from "@/theme";
import type { LeaderboardEntry } from "@kairos/shared";

export default function LeaderboardScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [lb, rank] = await Promise.all([api.leaderboard(), api.myRank()]);
        setEntries(lb.entries);
        setMyRank(rank.rank);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <Screen title="Leaderboard">
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  return (
    <Screen title="Leaderboard">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {myRank !== null && myRank !== undefined ? (
        <Text style={styles.myRank}>Your rank: #{myRank}</Text>
      ) : null}
      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.userId)}
        ListEmptyComponent={<Text style={styles.muted}>No scores yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.rank}>#{item.rank}</Text>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name ?? "Anonymous"}</Text>
              <Text style={styles.meta}>
                {item.currentStreak} day streak · {item.answers} answers
              </Text>
            </View>
            {item.avgScore !== null && item.avgScore !== undefined ? (
              <Text style={styles.avg}>{item.avgScore.toFixed(1)}</Text>
            ) : null}
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  rank: { fontSize: 16, fontWeight: "800", color: colors.accent, width: 44 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  avg: { fontSize: 18, fontWeight: "700", color: colors.success },
  myRank: { fontSize: 14, color: colors.text, marginBottom: 12 },
  error: { color: colors.danger, marginBottom: 12 },
  muted: { color: colors.muted, textAlign: "center", marginTop: 32 },
});
