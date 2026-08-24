import { useEffect, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { connectAnswerStream } from "@/api/client";
import { Screen } from "@/components/Screen";
import { MomentRing } from "@/components/MomentRing";
import { Card } from "@/components/Card";
import { Eyebrow } from "@/components/Eyebrow";
import { ScoreChip } from "@/components/ScoreChip";
import { Button } from "@/components/Button";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme";

type Status = "connecting" | "evaluating" | "completed" | "failed";

interface SubMetric {
  label: string;
  score: number;
}

interface EvalResult {
  score: number;
  feedback: string;
  modelAnswer: string;
  subMetrics?: SubMetric[];
}

export default function EvaluationScreen() {
  const router = useRouter();
  const { answerId, questionText, category } = useLocalSearchParams<{
    answerId: string;
    questionText: string;
    category: string;
  }>();
  const { colors } = useTheme();

  const [status, setStatus] = useState<Status>("connecting");
  const [streamText, setStreamText] = useState("");
  const [result, setResult] = useState<EvalResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<(() => void) | null>(null);

  // Pulse animation while evaluating
  const pulse = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    if (status === "evaluating" || status === "connecting") {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
    Animated.timing(pulse, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [status]);

  useEffect(() => {
    if (!answerId) return;

    closeRef.current?.();
    closeRef.current = connectAnswerStream(Number(answerId), {
      onStatus: (s) => {
        if (s === "evaluating") setStatus("evaluating");
      },
      onToken: (delta) => {
        setStatus("evaluating");
        setStreamText((prev) => prev + delta);
      },
      onDone: (data) => {
        setResult({
          score: data.score,
          feedback: data.feedback,
          modelAnswer: data.modelAnswer,
        });
        setStatus("completed");
      },
      onError: (msg) => {
        setError(msg);
        setStatus("failed");
      },
    });

    return () => closeRef.current?.();
  }, [answerId]);

  const score = result?.score ?? 0;

  return (
    <Screen back title="Evaluation">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Teal ring hero ── */}
        <View style={styles.hero}>
          <Animated.View style={{ opacity: pulse }}>
            <MomentRing
              progress={status === "completed" ? score / 10 : 0.5}
              size={200}
              variant="teal"
              symbol={
                status === "completed"
                  ? String(score)
                  : status === "failed"
                  ? "✕"
                  : "…"
              }
              answered={status === "completed"}
            />
          </Animated.View>

          <Text style={[styles.statusLabel, { color: colors.textDim }]}>
            {status === "connecting" && "CONNECTING"}
            {status === "evaluating" && "EVALUATING"}
            {status === "completed" && `SCORE  ${score} / 10`}
            {status === "failed" && "EVALUATION FAILED"}
          </Text>
        </View>

        {/* ── Streaming preview ── */}
        {streamText && status !== "completed" ? (
          <Card>
            <Eyebrow variant="teal">Processing</Eyebrow>
            <Text style={[styles.stream, { color: colors.textDim }]}>
              {streamText}
              <Text style={{ color: colors.accent2 }}>▌</Text>
            </Text>
          </Card>
        ) : null}

        {/* ── Final result ── */}
        {result ? (
          <>
            {/* Score bar */}
            <Card>
              <Eyebrow variant="teal">Score Breakdown</Eyebrow>
              <View style={styles.scoreRow}>
                <ScoreChip score={result.score} />
                <View style={styles.scoreBarTrack}>
                  <View
                    style={[
                      styles.scoreBarFill,
                      {
                        width: `${(result.score / 10) * 100}%`,
                        backgroundColor: colors.accent2,
                      },
                    ]}
                  />
                </View>
              </View>
            </Card>

            {/* Feedback */}
            <Card>
              <Eyebrow variant="teal">Feedback</Eyebrow>
              <Text style={[styles.feedback, { color: colors.text }]}>
                {result.feedback}
              </Text>
            </Card>

            {/* Model answer */}
            <Card>
              <Eyebrow>Model Answer</Eyebrow>
              <Text style={[styles.modelAnswer, { color: colors.textDim }]}>
                {result.modelAnswer}
              </Text>
            </Card>

            <Button
              title="Back to today"
              variant="secondary"
              onPress={() => router.replace("/(tabs)/today")}
            />
          </>
        ) : null}

        {error ? (
          <>
            <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
            <Button
              title="Go back"
              variant="secondary"
              onPress={() => router.back()}
            />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
  hero: { alignItems: "center", paddingVertical: 24 },
  statusLabel: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 11,
    letterSpacing: 1.5,
    marginTop: 16,
  },
  stream: {
    fontFamily: fonts.mono,
    fontSize: 13,
    lineHeight: 20,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  scoreBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  scoreBarFill: {
    height: 6,
    borderRadius: 3,
  },
  feedback: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 23,
  },
  modelAnswer: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
  },
});
