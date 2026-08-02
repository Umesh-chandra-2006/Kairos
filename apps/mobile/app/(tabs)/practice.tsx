import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { connectAnswerStream, api, ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { colors, radius } from "@/theme";
import { CATEGORIES, type Question } from "@kairos/shared";

interface EvalState {
  score: number | null;
  feedback: string;
  modelAnswer: string;
  error: string | null;
}

export default function PracticeScreen() {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [evalState, setEvalState] = useState<EvalState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<(() => void) | null>(null);

  useEffect(() => () => closeRef.current?.(), []);

  const loadQuestion = useCallback(async (cat?: string) => {
    setCategory(cat);
    setError(null);
    setEvalState(null);
    setAnswerText("");
    setLoading(true);
    try {
      const res = await api.practice(cat);
      setQuestion(res.question);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load a practice question");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setQuestion(null);
    setEvalState(null);
    setAnswerText("");
    setError(null);
  }, []);

  const submit = async () => {
    if (!question) return;
    setError(null);
    setSubmitting(true);
    try {
      const { answerId } = await api.submitPractice(question.id, answerText);
      setEvalState({ score: null, feedback: "", modelAnswer: "", error: null });
      setAnswerText("");

      closeRef.current?.();
      closeRef.current = connectAnswerStream(answerId, {
        onToken: (delta) =>
          setEvalState((prev) => (prev ? { ...prev, modelAnswer: prev.modelAnswer + delta } : prev)),
        onDone: (data) =>
          setEvalState({
            score: data.score,
            feedback: data.feedback,
            modelAnswer: data.modelAnswer,
            error: null,
          }),
        onError: (message) => setEvalState((prev) => (prev ? { ...prev, error: message } : prev)),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit answer");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen title="Practice">
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  if (!question) {
    return (
      <Screen title="Practice">
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.subtitle}>
            Sharpen your skills beyond the daily challenge. Pick a topic and answer a random question.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.chipGrid}>
            <Chip label="🎲 Surprise me" active={!category} onPress={() => loadQuestion(undefined)} />
            {CATEGORIES.map((c) => (
              <Chip key={c} label={c} active={category === c} onPress={() => loadQuestion(c)} />
            ))}
          </View>
        </ScrollView>
      </Screen>
    );
  }

  const isEvaluating = evalState !== null;

  return (
    <Screen title="Practice">
      <ScrollView contentContainerStyle={styles.scroll}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.card}>
          <Text style={styles.category}>{question.category}</Text>
          <Text style={styles.questionText}>{question.text}</Text>
          <Text style={styles.muted}>{question.rubricHints}</Text>

          {!isEvaluating ? (
            <>
              <Field
                label="Your answer"
                value={answerText}
                onChangeText={setAnswerText}
                multiline
                numberOfLines={6}
                style={styles.answerInput}
                placeholder="Write your answer (at least 20 characters)…"
              />
              <Button title="Submit answer" onPress={submit} loading={submitting} disabled={answerText.trim().length < 20} />
              <View style={{ height: 8 }} />
              <Button title="Change topic" variant="ghost" onPress={reset} />
            </>
          ) : (
            <View style={styles.eval}>
              {evalState.score !== null ? <Text style={styles.score}>Score: {evalState.score}/10</Text> : null}
              {evalState.feedback ? <Text style={styles.feedback}>{evalState.feedback}</Text> : null}
              {evalState.modelAnswer ? <Text style={styles.modelAnswer}>{evalState.modelAnswer}</Text> : null}
              {evalState.error ? <Text style={styles.error}>{evalState.error}</Text> : null}
              <View style={{ height: 8 }} />
              <Button title="Practice another" onPress={reset} />
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 24 },
  subtitle: { fontSize: 14, color: colors.muted, marginBottom: 16 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipLabel: { fontSize: 14, fontWeight: "500", color: colors.text },
  chipLabelActive: { color: "#ffffff" },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  category: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    color: colors.accent,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  questionText: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 8 },
  muted: { color: colors.muted, marginTop: 4, fontSize: 14 },
  answerInput: { height: 140, textAlignVertical: "top", paddingTop: 12 },
  error: { color: colors.danger, marginBottom: 12 },
  eval: { marginTop: 12 },
  score: { fontSize: 20, fontWeight: "700", color: colors.success, marginBottom: 8 },
  feedback: { fontSize: 15, color: colors.text, marginBottom: 8 },
  modelAnswer: { fontSize: 14, color: colors.muted, marginBottom: 8 },
});
