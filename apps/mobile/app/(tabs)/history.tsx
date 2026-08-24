import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { api, ApiError } from "@/api/client";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Eyebrow } from "@/components/Eyebrow";
import { ScoreChip } from "@/components/ScoreChip";
import { Pill } from "@/components/Pill";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme";
import type { AnswerWithQuestion } from "@kairos/shared";

export default function HistoryScreen() {
  const { colors } = useTheme();
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
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="History">
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <FlatList
        data={answers}
        keyExtractor={(item) => String(item.id)}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.listPadding}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Card center>
            <Text style={[styles.muted, { color: colors.textDim }]}>
              No completed challenges yet. Answer today's question to build your history!
            </Text>
          </Card>
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} />
          ) : null
        }
        renderItem={({ item }) => (
          <Card>
            <View style={styles.headerRow}>
              <Eyebrow>{item.question.category}</Eyebrow>
              <Text style={[styles.date, { color: colors.textDim }]}>
                {new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>

            <Text style={[styles.questionText, { color: colors.text }]} numberOfLines={2}>
              {item.question.text}
            </Text>

            <View style={styles.footerRow}>
              {item.score !== null ? (
                <ScoreChip score={item.score} />
              ) : (
                <Pill icon="⏳">{item.status}</Pill>
              )}
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listPadding: { paddingBottom: 40 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  date: {
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  questionText: {
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  error: { fontFamily: fonts.body, fontSize: 14, marginBottom: 12 },
  muted: { fontFamily: fonts.body, fontSize: 14, textAlign: "center", paddingVertical: 12 },
});
