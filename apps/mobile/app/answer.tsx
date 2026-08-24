import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api, ApiError, connectAnswerStream } from "@/api/client";
import { Screen } from "@/components/Screen";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { Eyebrow } from "@/components/Eyebrow";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme";

export default function AnswerScreen() {
  const router = useRouter();
  const { questionId, questionText, category } = useLocalSearchParams<{
    questionId: string;
    questionText: string;
    category: string;
  }>();
  const { colors } = useTheme();

  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MIN_CHARS = 20;
  const charCount = answerText.trim().length;
  const canSubmit = charCount >= MIN_CHARS && !submitting;

  const submit = async () => {
    if (!questionId) return;
    setError(null);
    setSubmitting(true);
    try {
      const { answerId } = await api.submitAnswer(Number(questionId), answerText);
      // Navigate to evaluation screen, passing the answerId
      router.replace({
        pathname: "/evaluation",
        params: { answerId: String(answerId), questionText, category },
      });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to submit answer"
      );
      setSubmitting(false);
    }
  };

  return (
    <Screen back title="Write Answer">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={88}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Question recap */}
          <View
            style={[
              styles.questionBlock,
              { borderLeftColor: colors.accent, backgroundColor: colors.surface },
            ]}
          >
            <Eyebrow>{category ?? "Question"}</Eyebrow>
            <Text style={[styles.questionText, { color: colors.text }]}>
              {questionText}
            </Text>
          </View>

          {/* Answer field */}
          <Field
            label="Your answer"
            value={answerText}
            onChangeText={setAnswerText}
            multiline
            numberOfLines={8}
            placeholder="Write your answer here… (at least 20 characters)"
            autoFocus
          />

          {/* Character counter */}
          <View style={styles.counterRow}>
            <Text
              style={[
                styles.counter,
                {
                  color:
                    charCount < MIN_CHARS ? colors.textDim : colors.accent2,
                },
              ]}
            >
              {charCount} chars
              {charCount < MIN_CHARS
                ? ` — ${MIN_CHARS - charCount} more to go`
                : " ✓"}
            </Text>
          </View>

          {error ? (
            <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
          ) : null}

          <Button
            title="Submit for evaluation →"
            onPress={submit}
            loading={submitting}
            disabled={!canSubmit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
  questionBlock: {
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  questionText: {
    fontFamily: fonts.sans,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  counterRow: { alignItems: "flex-end", marginTop: -4, marginBottom: 16 },
  counter: { fontFamily: fonts.mono, fontSize: 11 },
  error: { fontFamily: fonts.sans, fontSize: 14, marginBottom: 12 },
});
