import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { api, ApiError } from "@/api/client";
import { Screen } from "@/components/Screen";
import { colors } from "@/theme";
import type { AnswerWithQuestion } from "@kairos/shared";

export default function HistoryScreen() {
  const [answers, setAnswers] = useState<AnswerWithQuestion[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (cursor?: number) => {
    try {
      const res = await api.history(cursor, 20);
      setAnswers((prev) => (cursor ? [...prev, ...res.answers] : res.answers));
      setNextCursor(res.nextCursor);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    load(nextCursor);
  };

  if (loading) {
    return (
      <Screen title="History">
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  return (
    <Screen title="History">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={answers}
        keyExtractor={(item) => String(item.id)}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={<Text style={styles.muted}>No answers yet. Answer today's question!</Text>}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.category}>{item.question.category}</Text>
              <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.text} numberOfLines={2}>
              {item.question.text}
            </Text>
            <View style={styles.footer}>
              <Text style={styles.status}>{item.status}</Text>
              {item.score !== null ? <Text style={styles.score}>Score {item.score}/10</Text> : null}
            </View>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  category: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", color: colors.accent },
  date: { fontSize: 12, color: colors.muted },
  text: { fontSize: 15, color: colors.text, marginBottom: 8 },
  footer: { flexDirection: "row", justifyContent: "space-between" },
  status: { fontSize: 13, color: colors.muted },
  score: { fontSize: 13, fontWeight: "700", color: colors.success },
  error: { color: colors.danger, marginBottom: 12 },
  muted: { color: colors.muted, textAlign: "center", marginTop: 32 },
});
