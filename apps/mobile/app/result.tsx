import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Colors, getScoreColor } from "../constants/Colors";

export default function ResultScreen() {
  const router = useRouter();
  const { score, feedback, modelAnswer, streakCurrent, streakLongest } =
    useLocalSearchParams<{
      score: string;
      feedback: string;
      modelAnswer: string;
      streakCurrent: string;
      streakLongest: string;
    }>();

  const scoreNum = Number(score) || 0;
  const streakNum = Number(streakCurrent) || 0;

  const [modelExpanded, setModelExpanded] = useState(false);

  // Animated streak counter
  const animatedStreak = useRef(new Animated.Value(0)).current;
  const [displayStreak, setDisplayStreak] = useState(0);

  // Score scale-in animation
  const scoreScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Score pop-in
    Animated.spring(scoreScale, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();

    // Streak count-up
    const start = Math.max(0, streakNum - 1);
    animatedStreak.setValue(start);
    const listener = animatedStreak.addListener(({ value }) => {
      setDisplayStreak(Math.round(value));
    });
    Animated.timing(animatedStreak, {
      toValue: streakNum,
      duration: 600,
      delay: 400,
      useNativeDriver: false,
    }).start();
    return () => animatedStreak.removeListener(listener);
  }, []);

  const scoreColor = getScoreColor(scoreNum);

  const getScoreLabel = () => {
    if (scoreNum >= 8) return "Excellent! 🎉";
    if (scoreNum >= 5) return "Good effort 💪";
    return "Keep practicing 📚";
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Score hero */}
        <View style={styles.scoreHero}>
          <Animated.View style={{ transform: [{ scale: scoreScale }] }}>
            <Text style={[styles.scoreNumber, { color: scoreColor }]}>
              {scoreNum}/10
            </Text>
          </Animated.View>
          <Text style={styles.scoreLabel}>{getScoreLabel()}</Text>

          {/* Streak */}
          <View style={styles.streakRow}>
            <Text style={styles.streakFire}>🔥</Text>
            <Text style={styles.streakText}>
              Streak:{" "}
              <Text style={styles.streakNumber}>{displayStreak} days</Text>
            </Text>
          </View>
        </View>

        {/* Feedback */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What to Improve</Text>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>

        {/* Model Answer — collapsible */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => setModelExpanded((v) => !v)}
          activeOpacity={0.8}
        >
          <View style={styles.modelHeader}>
            <Text style={styles.cardTitle}>Model Answer</Text>
            <Text style={styles.expandIcon}>{modelExpanded ? "▲" : "▼"}</Text>
          </View>
          {!modelExpanded && (
            <Text style={styles.collapseHint}>Tap to reveal a 9-10/10 answer</Text>
          )}
          {modelExpanded && (
            <Text style={styles.modelAnswerText}>{modelAnswer}</Text>
          )}
        </TouchableOpacity>

        {/* Back to Home */}
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },

  scoreHero: {
    alignItems: "center",
    marginBottom: 32,
    paddingVertical: 32,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  scoreNumber: { fontSize: 72, fontWeight: "900", letterSpacing: -2 },
  scoreLabel: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: "600",
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  streakFire: { fontSize: 18, marginRight: 6 },
  streakText: { fontSize: 15, color: Colors.textSecondary },
  streakNumber: { color: Colors.streakGold, fontWeight: "800" },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  feedbackText: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 23,
  },

  modelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  expandIcon: { color: Colors.textMuted, fontSize: 12 },
  collapseHint: { fontSize: 13, color: Colors.textMuted, fontStyle: "italic" },
  modelAnswerText: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 23,
    marginTop: 4,
  },

  homeBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginTop: 8,
  },
  homeBtnText: { color: Colors.textSecondary, fontSize: 16, fontWeight: "600" },
});
