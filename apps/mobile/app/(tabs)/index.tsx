import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { api, Question, Answer } from "../../lib/api";
import { Colors } from "../../constants/Colors";

type HomeState =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "unanswered";
      question: Question;
      streak: { current: number; longest: number };
    }
  | {
      status: "answered";
      question: Question;
      answer: Answer;
      streak: { current: number; longest: number };
    };

// Skeleton shimmer component
function SkeletonBlock({ width, height, style }: { width: number | string; height: number; style?: object }) {
  const anim = useState(() => new Animated.Value(0.3))[0];

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: 8, backgroundColor: Colors.surfaceElevated, opacity: anim },
        style,
      ]}
    />
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [state, setState] = useState<HomeState>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [todayRes, streakRes] = await Promise.all([
        api.getTodayQuestion(),
        api.getStreak(),
      ]);

      const streak = { current: streakRes.current, longest: streakRes.longest };

      if (todayRes.alreadyAnswered && todayRes.answer) {
        setState({
          status: "answered",
          question: todayRes.question,
          answer: todayRes.answer,
          streak,
        });
      } else {
        setState({
          status: "unanswered",
          question: todayRes.question,
          streak,
        });
      }
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getScoreColor = (score: number) => {
    if (score <= 4) return Colors.scoreLow;
    if (score <= 7) return Colors.scoreMid;
    return Colors.scoreHigh;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
          />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.appName}>Kairos</Text>
          {state.status !== "loading" && state.status !== "error" && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakFire}>🔥</Text>
              <Text style={styles.streakCount}>{state.streak.current}</Text>
              <Text style={styles.streakLabel}> day streak</Text>
            </View>
          )}
        </View>

        {/* Loading skeleton */}
        {state.status === "loading" && (
          <View style={styles.card}>
            <SkeletonBlock width="40%" height={14} style={{ marginBottom: 16 }} />
            <SkeletonBlock width="100%" height={20} style={{ marginBottom: 8 }} />
            <SkeletonBlock width="80%" height={20} style={{ marginBottom: 32 }} />
            <SkeletonBlock width="100%" height={52} />
          </View>
        )}

        {/* Error state */}
        {state.status === "error" && (
          <TouchableOpacity style={styles.card} onPress={loadData}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorText}>Couldn't load question.</Text>
            <Text style={styles.errorSubtext}>Tap to retry</Text>
          </TouchableOpacity>
        )}

        {/* State A: Unanswered */}
        {state.status === "unanswered" && (
          <View>
            <View style={styles.card}>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: Colors.categoryColors[state.question.category] + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: Colors.categoryColors[state.question.category] },
                    ]}
                  >
                    {state.question.category}
                  </Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        Colors.difficultyColors[state.question.difficulty] + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: Colors.difficultyColors[state.question.difficulty] },
                    ]}
                  >
                    {state.question.difficulty}
                  </Text>
                </View>
              </View>

              <Text style={styles.questionText}>{state.question.text}</Text>
            </View>

            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() =>
                router.push({
                  pathname: "/answer",
                  params: { questionId: state.question._id, questionText: state.question.text, category: state.question.category, difficulty: state.question.difficulty },
                })
              }
            >
              <Text style={styles.ctaBtnText}>Answer Now →</Text>
            </TouchableOpacity>

            <View style={styles.hintCard}>
              <Text style={styles.hintText}>
                💡 Answer every day to keep your streak alive and climb your weakest subjects
              </Text>
            </View>
          </View>
        )}

        {/* State B: Already answered */}
        {state.status === "answered" && (
          <View>
            <View style={styles.doneCard}>
              <Text style={styles.doneEmoji}>✅</Text>
              <Text style={styles.doneTitle}>You're done for today!</Text>
              <Text style={styles.doneSubtitle}>Great work keeping the streak alive</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>Today's Score</Text>
                <Text
                  style={[
                    styles.scoreValue,
                    { color: getScoreColor(state.answer.score) },
                  ]}
                >
                  {state.answer.score}/10
                </Text>
              </View>

              <Text style={styles.feedbackPreview} numberOfLines={3}>
                {state.answer.feedback}
              </Text>

              <TouchableOpacity
                style={styles.viewResultBtn}
                onPress={() =>
                  router.push({
                    pathname: "/result",
                    params: {
                      score: String(state.answer.score),
                      feedback: state.answer.feedback,
                      modelAnswer: state.answer.modelAnswer,
                      streakCurrent: String(state.streak.current),
                      streakLongest: String(state.streak.longest),
                    },
                  })
                }
              >
                <Text style={styles.viewResultBtnText}>View Full Result →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.streakGold + "40",
  },
  streakFire: { fontSize: 16 },
  streakCount: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.streakGold,
    marginLeft: 4,
  },
  streakLabel: { fontSize: 13, color: Colors.textSecondary },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: 16,
  },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },

  questionText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
    lineHeight: 26,
  },

  ctaBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginBottom: 16,
  },
  ctaBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },

  hintCard: {
    backgroundColor: Colors.accentDim + "80",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.accent + "30",
  },
  hintText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },

  doneCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.scoreHigh + "40",
  },
  doneEmoji: { fontSize: 44, marginBottom: 12 },
  doneTitle: { fontSize: 22, fontWeight: "800", color: Colors.textPrimary },
  doneSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },

  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  scoreLabel: { fontSize: 15, color: Colors.textSecondary, fontWeight: "600" },
  scoreValue: { fontSize: 26, fontWeight: "800" },

  feedbackPreview: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  viewResultBtn: {
    backgroundColor: Colors.accentDim,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  viewResultBtnText: { color: Colors.accentLight, fontWeight: "700", fontSize: 15 },

  errorEmoji: { fontSize: 36, textAlign: "center", marginBottom: 8 },
  errorText: { fontSize: 16, color: Colors.textPrimary, textAlign: "center", fontWeight: "600" },
  errorSubtext: { fontSize: 13, color: Colors.textMuted, textAlign: "center", marginTop: 4 },
});
