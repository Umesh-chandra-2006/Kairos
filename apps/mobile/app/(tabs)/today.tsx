import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { connectAnswerStream, api, ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { colors } from "@/theme";
import type { TodayQuestionResponse } from "@kairos/shared";

interface EvalState {
  status: string;
  score: number | null;
  feedback: string;
  modelAnswer: string;
  error: string | null;
}

export default function TodayScreen() {
  const [today, setToday] = useState<TodayQuestionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [evalState, setEvalState] = useState<EvalState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<(() => void) | null>(null);

  const loadToday = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.today();
      setToday(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load today's question");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadToday();
    return () => closeRef.current?.();
  }, [loadToday]);

  const submit = async () => {
    if (!today?.question) return;
    setError(null);
    setSubmitting(true);
    try {
      const { answerId } = await api.submitAnswer(today.question.id, answerText);
      setEvalState({ status: "pending", score: null, feedback: "", modelAnswer: "", error: null });
      setAnswerText("");

      closeRef.current?.();
      closeRef.current = connectAnswerStream(answerId, {
        onStatus: (status) => setEvalState((prev) => (prev ? { ...prev, status } : prev)),
        onToken: (delta) =>
          setEvalState((prev) => (prev ? { ...prev, modelAnswer: prev.modelAnswer + delta } : prev)),
        onDone: (data) => {
          setEvalState({
            status: "completed",
            score: data.score,
            feedback: data.feedback,
            modelAnswer: data.modelAnswer,
            error: null,
          });
          loadToday();
        },
        onError: (message) =>
          setEvalState((prev) => (prev ? { ...prev, status: "failed", error: message } : prev)),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit answer");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen title="Today">
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  return (
    <Screen title="Today">
      <ScrollView contentContainerStyle={styles.scroll}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!today?.question ? (
          <Text style={styles.muted}>No question assigned for today yet.</Text>
        ) : today.alreadyAnswered && !evalState ? (
          <View style={styles.card}>
            <Text style={styles.category}>{today.question.category}</Text>
            <Text style={styles.questionText}>{today.question.text}</Text>
            <Text style={styles.muted}>You've already answered today's question.</Text>
            <Button title="View history" variant="ghost" onPress={loadToday} />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.category}>{today.question.category}</Text>
            <Text style={styles.questionText}>{today.question.text}</Text>
            <Text style={styles.muted}>{today.question.rubricHints}</Text>

            {!evalState ? (
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
                <Button
                  title="Submit answer"
                  onPress={submit}
                  loading={submitting}
                  disabled={answerText.trim().length < 20}
                />
              </>
            ) : (
              <View style={styles.eval}>
                <Text style={styles.status}>Status: {evalState.status}</Text>
                {evalState.score !== null ? (
                  <Text style={styles.score}>Score: {evalState.score}/10</Text>
                ) : null}
                {evalState.feedback ? <Text style={styles.feedback}>{evalState.feedback}</Text> : null}
                {evalState.modelAnswer ? (
                  <Text style={styles.modelAnswer}>{evalState.modelAnswer}</Text>
                ) : null}
                {evalState.error ? <Text style={styles.error}>{evalState.error}</Text> : null}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 24 },
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
  status: { fontSize: 14, color: colors.muted, marginBottom: 8 },
  score: { fontSize: 20, fontWeight: "700", color: colors.success, marginBottom: 8 },
  feedback: { fontSize: 15, color: colors.text, marginBottom: 8 },
  modelAnswer: { fontSize: 14, color: colors.muted, marginBottom: 8 },
});
