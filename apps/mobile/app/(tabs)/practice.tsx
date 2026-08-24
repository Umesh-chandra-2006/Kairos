import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { connectAnswerStream, api, ApiError } from "@/api/client";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Eyebrow } from "@/components/Eyebrow";
import { ScoreChip } from "@/components/ScoreChip";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { useTheme } from "@/theme/ThemeContext";
import { fonts, radii } from "@/theme";
import { CORE_CATEGORIES, PRACTICE_CATEGORIES, type Question } from "@kairos/shared";

interface EvalState {
  score: number | null;
  feedback: string;
  modelAnswer: string;
  streaming: boolean;
  error: string | null;
}

const CATEGORY_ICON: Record<string, string> = {
  DSA: "⬡",
  OS: "◎",
  DBMS: "◈",
  Networks: "⊕",
  OOP: "⬡",
  SystemDesign: "⊞",
  Behavioral: "◉",
  FullStack: "⊗",
  Frontend: "◈",
  Backend: "⊕",
  HR: "◎",
  Cloud: "⊙",
  Security: "⊛",
  Testing: "◇",
  DevOps: "⊞",
  Mobile: "◉",
  MachineLearning: "⊗",
  Agile: "◎",
  Product: "◈",
};

export default function PracticeScreen() {
  const { colors } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [evalState, setEvalState] = useState<EvalState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<(() => void) | null>(null);

  useEffect(() => () => closeRef.current?.(), []);

  const loadQuestion = useCallback(async (cat?: string) => {
    setSelectedCategory(cat);
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
    closeRef.current?.();
  }, []);

  const submit = async () => {
    if (!question) return;
    setError(null);
    setSubmitting(true);
    try {
      const { answerId } = await api.submitPractice(question.id, answerText);
      setEvalState({ score: null, feedback: "", modelAnswer: "", streaming: true, error: null });
      setAnswerText("");

      closeRef.current?.();
      closeRef.current = connectAnswerStream(answerId, {
        onToken: (delta) =>
          setEvalState((prev) => prev ? { ...prev, modelAnswer: prev.modelAnswer + delta } : prev),
        onDone: (data) =>
          setEvalState({
            score: data.score,
            feedback: data.feedback,
            modelAnswer: data.modelAnswer,
            streaming: false,
            error: null,
          }),
        onError: (message) =>
          setEvalState((prev) => prev ? { ...prev, streaming: false, error: message } : prev),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit answer");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Hub screen (category picker) ──
  if (!question && !loading) {
    return (
      <Screen>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Eyebrow>Practice Hub</Eyebrow>
          <Text style={[styles.subtitle, { color: colors.textDim }]}>
            Sharpen skills beyond the daily challenge. Pick a topic and get a random question.
          </Text>

          {error ? (
            <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
          ) : null}

          {/* Surprise me */}
          <Pressable
            onPress={() => loadQuestion(undefined)}
            style={({ pressed }) => [
              styles.surpriseBtn,
              { borderColor: colors.accent, backgroundColor: `${colors.accent}14` },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[styles.surpriseText, { color: colors.accent }]}>
              🎲  Surprise me
            </Text>
          </Pressable>

          {/* Core */}
          <Text style={[styles.groupLabel, { color: colors.textDim }]}>CORE</Text>
          <View style={styles.chipGrid}>
            {CORE_CATEGORIES.map((c) => (
              <CategoryChip
                key={c}
                label={c}
                icon={CATEGORY_ICON[c] ?? "◉"}
                active={selectedCategory === c}
                colors={colors}
                onPress={() => loadQuestion(c)}
              />
            ))}
          </View>

          {/* Practice */}
          <Text style={[styles.groupLabel, { color: colors.textDim }]}>PRACTICE</Text>
          <View style={styles.chipGrid}>
            {PRACTICE_CATEGORIES.map((c) => (
              <CategoryChip
                key={c}
                label={c}
                icon={CATEGORY_ICON[c] ?? "◉"}
                active={selectedCategory === c}
                colors={colors}
                onPress={() => loadQuestion(c)}
              />
            ))}
          </View>
        </ScrollView>
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </Screen>
    );
  }

  // ── Question + answer screen ──
  return (
    <Screen back title="Practice">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
        ) : null}

        <Card>
          <Eyebrow>{question!.category}</Eyebrow>
          <Text style={[styles.questionText, { color: colors.text }]}>
            {question!.text}
          </Text>
          {question!.rubricHints ? (
            <Text style={[styles.hint, { color: colors.textDim }]}>
              {question!.rubricHints}
            </Text>
          ) : null}
        </Card>

        {!evalState ? (
          <>
            <Field
              label="Your answer"
              value={answerText}
              onChangeText={setAnswerText}
              multiline
              numberOfLines={7}
              placeholder="Write your answer… (at least 20 characters)"
            />
            <Button
              title="Submit for evaluation →"
              onPress={submit}
              loading={submitting}
              disabled={answerText.trim().length < 20}
            />
            <View style={{ height: 8 }} />
            <Button title="Change topic" variant="secondary" onPress={reset} />
          </>
        ) : (
          <>
            {evalState.streaming ? (
              <Card>
                <Eyebrow variant="teal">Evaluating</Eyebrow>
                <Text style={[styles.stream, { color: colors.textDim }]}>
                  {evalState.modelAnswer || "Reading your answer…"}
                  <Text style={{ color: colors.accent2 }}>▌</Text>
                </Text>
              </Card>
            ) : (
              <>
                {evalState.score !== null && (
                  <Card>
                    <Eyebrow variant="teal">Score</Eyebrow>
                    <View style={styles.scoreRow}>
                      <ScoreChip score={evalState.score} />
                      <Text style={[styles.scoreText, { color: colors.text }]}>
                        {evalState.score} / 10
                      </Text>
                    </View>
                  </Card>
                )}
                {evalState.feedback ? (
                  <Card>
                    <Eyebrow variant="teal">Feedback</Eyebrow>
                    <Text style={[styles.feedback, { color: colors.text }]}>
                      {evalState.feedback}
                    </Text>
                  </Card>
                ) : null}
                {evalState.modelAnswer ? (
                  <Card>
                    <Eyebrow>Model Answer</Eyebrow>
                    <Text style={[styles.modelAnswer, { color: colors.textDim }]}>
                      {evalState.modelAnswer}
                    </Text>
                  </Card>
                ) : null}
                {evalState.error ? (
                  <Text style={[styles.error, { color: colors.danger }]}>
                    {evalState.error}
                  </Text>
                ) : null}
              </>
            )}
            <Button title="Practice another" onPress={reset} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function CategoryChip({
  label,
  icon,
  active,
  colors,
  onPress,
}: {
  label: string;
  icon: string;
  active: boolean;
  colors: any;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: active ? colors.accent : colors.line,
          backgroundColor: active ? `${colors.accent}18` : colors.surface,
        },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text style={[styles.chipIcon, { color: active ? colors.accent : colors.textDim }]}>
        {icon}
      </Text>
      <Text
        style={[
          styles.chipLabel,
          { color: active ? colors.accent : colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  subtitle: { fontFamily: "IBMPlexSans_400Regular", fontSize: 14, lineHeight: 20, marginBottom: 20 },
  groupLabel: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 9,
    letterSpacing: 1.2,
    marginTop: 20,
    marginBottom: 10,
  },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipIcon: { fontFamily: "IBMPlexMono_600SemiBold", fontSize: 13 },
  chipLabel: { fontFamily: "IBMPlexSans_400Regular", fontSize: 13, fontWeight: "500" },
  surpriseBtn: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 4,
  },
  surpriseText: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  questionText: {
    fontFamily: "IBMPlexSans_400Regular",
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 25,
    marginBottom: 10,
  },
  hint: { fontFamily: "IBMPlexSans_400Regular", fontSize: 13, lineHeight: 19, marginBottom: 4 },
  stream: { fontFamily: "IBMPlexMono_400Regular", fontSize: 13, lineHeight: 20 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  scoreText: { fontFamily: "IBMPlexMono_600SemiBold", fontSize: 28, fontWeight: "700" },
  feedback: { fontFamily: "IBMPlexSans_400Regular", fontSize: 15, lineHeight: 22 },
  modelAnswer: { fontFamily: "IBMPlexSans_400Regular", fontSize: 14, lineHeight: 21 },
  error: { fontFamily: "IBMPlexSans_400Regular", fontSize: 14, marginBottom: 12 },
});
