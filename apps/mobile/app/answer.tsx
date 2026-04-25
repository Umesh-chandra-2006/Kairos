import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useState, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../lib/api";
import { Colors } from "../constants/Colors";

export default function AnswerScreen() {
  const router = useRouter();
  const { questionId, questionText, category, difficulty } = useLocalSearchParams<{
    questionId: string;
    questionText: string;
    category: string;
    difficulty: string;
  }>();

  const [answerText, setAnswerText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const MIN_CHARS = 20;
  const canSubmit = answerText.trim().length >= MIN_CHARS && !loading;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    try {
      const result = await api.submitAnswer({
        questionId: questionId!,
        answerText: answerText.trim(),
      });

      router.replace({
        pathname: "/result",
        params: {
          score: String(result.score),
          feedback: result.feedback,
          modelAnswer: result.modelAnswer,
          streakCurrent: String(result.streak.current),
          streakLongest: String(result.streak.longest),
        },
      });
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "Evaluation failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!loading}
      >
        {/* Header */}
        <View style={styles.header}>
          {!loading && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
            >
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.screenTitle}>Your Answer</Text>
        </View>

        {/* Question card */}
        <View style={styles.questionCard}>
          <View style={styles.badgeRow}>
            {category && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: (Colors.categoryColors[category] || Colors.accent) + "25" },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: Colors.categoryColors[category] || Colors.accent },
                  ]}
                >
                  {category}
                </Text>
              </View>
            )}
            {difficulty && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      (Colors.difficultyColors[difficulty] || Colors.accent) + "25",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: Colors.difficultyColors[difficulty] || Colors.accent },
                  ]}
                >
                  {difficulty}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.questionText}>{questionText}</Text>
        </View>

        {/* Answer input */}
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={answerText}
            onChangeText={setAnswerText}
            multiline
            numberOfLines={6}
            placeholder="Type your answer here… Think out loud, use examples, explain your reasoning."
            placeholderTextColor={Colors.textMuted}
            editable={!loading}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>
            {answerText.length} chars
            {answerText.length < MIN_CHARS && answerText.length > 0 && (
              <Text style={styles.charCountWarn}>
                {" "}(min {MIN_CHARS} to submit)
              </Text>
            )}
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Submit button */}
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={onSubmit}
          disabled={!canSubmit}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.submitBtnText}>  Evaluating…</Text>
            </View>
          ) : (
            <Text style={styles.submitBtnText}>Submit Answer</Text>
          )}
        </TouchableOpacity>

        {loading && (
          <Text style={styles.loadingHint}>
            Gemini is reviewing your answer — this takes a few seconds ✨
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 },

  header: { marginBottom: 20 },
  backBtn: { marginBottom: 8 },
  backBtnText: { color: Colors.accentLight, fontSize: 15, fontWeight: "600" },
  screenTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },

  questionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: 20,
  },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  questionText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
    lineHeight: 24,
  },

  inputWrapper: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: 16,
    overflow: "hidden",
  },
  textInput: {
    color: Colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    padding: 16,
    minHeight: 160,
  },
  charCount: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "right",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  charCountWarn: { color: Colors.warning },

  errorBanner: {
    backgroundColor: Colors.error + "20",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.error + "50",
  },
  errorText: { color: Colors.error, fontSize: 13, textAlign: "center" },

  submitBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  loadingRow: { flexDirection: "row", alignItems: "center" },
  loadingHint: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
    fontStyle: "italic",
  },
});
