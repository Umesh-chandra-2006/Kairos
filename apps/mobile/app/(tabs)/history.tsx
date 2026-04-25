import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SectionList,
  ActivityIndicator,
} from "react-native";
import { api, Answer, Question } from "../../lib/api";
import { Colors, getScoreColor } from "../../constants/Colors";

interface HistoryItem {
  answer: Answer;
  question: Question;
}

interface Section {
  title: string;
  data: HistoryItem[];
}

function groupByDate(items: HistoryItem[]): Section[] {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const groups: Record<string, HistoryItem[]> = {};
  for (const item of items) {
    const date = item.answer.date;
    const label =
      date === today ? "Today" : date === yesterday ? "Yesterday" : date;
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  }

  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}

export default function HistoryScreen() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.getHistory();
      // Backend returns answers with questionId populated as Question object
      const items: HistoryItem[] = res.answers.map((a) => {
        const answer = a as Answer;
        const question = answer.questionId as unknown as Question;
        return { answer, question };
      });
      setSections(groupByDate(items));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <TouchableOpacity style={styles.centered} onPress={loadHistory}>
        <Text style={styles.errorText}>⚠️ Failed to load history</Text>
        <Text style={styles.retryText}>Tap to retry</Text>
      </TouchableOpacity>
    );
  }

  if (sections.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyEmoji}>📭</Text>
        <Text style={styles.emptyTitle}>No answers yet</Text>
        <Text style={styles.emptySubtitle}>
          Answer today's question to get started
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.answer._id}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const isExpanded = expandedId === item.answer._id;
          return (
            <TouchableOpacity
              style={styles.itemCard}
              onPress={() =>
                setExpandedId(isExpanded ? null : item.answer._id)
              }
              activeOpacity={0.8}
            >
              {/* Collapsed row */}
              <View style={styles.itemHeader}>
                <View style={styles.itemMeta}>
                  <View
                    style={[
                      styles.catBadge,
                      {
                        backgroundColor:
                          (Colors.categoryColors[item.question?.category] ||
                            Colors.accent) + "20",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.catBadgeText,
                        {
                          color:
                            Colors.categoryColors[item.question?.category] ||
                            Colors.accent,
                        },
                      ]}
                    >
                      {item.question?.category}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.scoreBadge,
                      { color: getScoreColor(item.answer.score) },
                    ]}
                  >
                    {item.answer.score}/10
                  </Text>
                </View>
                <Text style={styles.expandIcon}>{isExpanded ? "▲" : "▼"}</Text>
              </View>

              <Text style={styles.questionPreview} numberOfLines={isExpanded ? undefined : 2}>
                {item.question?.text}
              </Text>

              {/* Expanded */}
              {isExpanded && (
                <View style={styles.expandedArea}>
                  <View style={styles.divider} />
                  <Text style={styles.expandLabel}>FEEDBACK</Text>
                  <Text style={styles.expandText}>{item.answer.feedback}</Text>

                  <Text style={[styles.expandLabel, { marginTop: 14 }]}>
                    MODEL ANSWER
                  </Text>
                  <Text style={styles.expandText}>{item.answer.modelAnswer}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>History</Text>
            <Text style={styles.pageSubtitle}>Tap any answer to expand</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },

  pageHeader: { paddingTop: 60, marginBottom: 8 },
  pageTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  pageSubtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },

  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
  },

  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  itemMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catBadgeText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  scoreBadge: { fontSize: 16, fontWeight: "800" },
  expandIcon: { color: Colors.textMuted, fontSize: 11 },

  questionPreview: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
    fontWeight: "500",
  },

  expandedArea: { marginTop: 12 },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
    marginBottom: 14,
  },
  expandLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  expandText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },

  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: Colors.textPrimary },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 6 },
  errorText: { fontSize: 16, color: Colors.textPrimary, fontWeight: "600" },
  retryText: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
});
