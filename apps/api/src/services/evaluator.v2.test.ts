import { describe, expect, it } from "vitest";
import { MockAIProvider } from "./providers/mock";
import { EvalModelOutputError, evaluateV2 } from "./evaluator/v2";
import type { ChatJSONProvider, ASRWord } from "./providers/types";
import { words } from "../test/fixtures/asr";
import { computeDeliveryMetrics } from "./delivery";
import type { EvaluationResult } from "@kairos/shared";

const RUBRIC = "b-tree structure keeps lookups fast; write penalty on inserts; optimizer may skip index for large scans";

const TRANSCRIPT =
  "A database index is a b-tree data structure that lets lookups run in logarithmic time instead of scanning the whole table. " +
  "The main trade-off is the write penalty: every insert must also update the index. " +
  "And for queries that need most of the table anyway, the optimizer may skip the index entirely. " +
  "In summary, indexes speed up reads at the cost of slower writes and extra storage.";

// ~150 wpm pacing across the whole transcript.
const ASR_WORDS = words(500, 400, TRANSCRIPT.split(/\s+/));

const baseParams = {
  answerId: 42,
  questionText: "What is a database index and what are its trade-offs?",
  rubricHints: RUBRIC,
  level: "intermediate",
  transcript: TRANSCRIPT,
  words: ASR_WORDS,
  durationMs: 500 + ASR_WORDS.length * 400,
  hasRealTimestamps: true,
};

describe("evaluateV2", () => {
  it("produces a contract-valid result with correct provenance", async () => {
    const result = await evaluateV2(baseParams, new MockAIProvider());

    expect(result.contractVersion).toBe(1);
    expect(result.answerId).toBe(42);
    expect(result.delivery.source).toBe("deterministic");
    expect(result.content.source).toBe("model");
    expect(result.structure.directness.source).toBe("deterministic");
    expect(result.structure.repetition.source).toBe("deterministic");
    expect(result.structure.conclusion.source).toBe("deterministic");
    // Organization comes from the model — it is a judgment call.
    expect(result.structure.organization.source).toBe("model");
    expect(result.delivery.durationMs).toBeGreaterThan(0);
    expect(["needs_work", "solid", "strong"]).toContain(result.overallBand);
  });

  it("is deterministic apart from createdAt", async () => {
    const a = await evaluateV2(baseParams, new MockAIProvider());
    const b = await evaluateV2(baseParams, new MockAIProvider());
    const strip = (o: object) => JSON.stringify({ ...o, createdAt: null });
    expect(strip(b)).toBe(strip(a));
  });

  it("rewards transcripts that cover the rubric and closes with a conclusion marker", async () => {
    const good = await evaluateV2(baseParams, new MockAIProvider());
    // The mock model maps rubric coverage onto contentBand; this transcript
    // mentions b-tree, write penalty-ish tokens, optimizer, skip, index.
    expect(["solid", "strong"]).toContain(good.content.band);
    // Deterministic conclusion detector sees "In summary".
    expect(good.structure.conclusion.value).toBe("clear");

    const weakTranscript = { ...baseParams, transcript: "I am not sure what an index really is sorry." };
    const bad = await evaluateV2(weakTranscript, new MockAIProvider());
    expect(bad.content.band).toBe("needs_work");
    expect(bad.structure.conclusion.value).not.toBe("clear");
    expect(bad.overallBand).toBe("needs_work");
  });

  it("throws retryable EvalModelOutputError when the model cannot emit valid JSON", async () => {
    const broken: ChatJSONProvider = {
      name: "broken",
      modelVersion: "0",
      completeJSON: async () => ({ nonsense: true }),
    };
    await expect(evaluateV2(baseParams, broken)).rejects.toBeInstanceOf(EvalModelOutputError);
  });

  it("focuses nextAction on the weakest dimension", async () => {
    const result = await evaluateV2(
      { ...baseParams, transcript: "um uh um uh I think indexes are um like tables maybe fast" },
      new MockAIProvider(),
    );
    expect(["content", "structure", "delivery"]).toContain(result.nextAction.focusDimension);
    expect(result.nextAction.instruction.length).toBeGreaterThanOrEqual(20);
  });
});

// ---------------------------------------------------------------------------
// EvidenceRefs E2E verification
//
// Every evidenceRef must resolve to actual rubric, transcript, timestamp,
// or deterministic-metric evidence. No orphan references allowed.
// ---------------------------------------------------------------------------

/**
 * Derive the canonical rubric token set from rubricHints — the same set
 * the evaluator uses internally. Every rubric_token evidenceRef must
 * correspond to one of these tokens.
 */
function deriveRubricTokens(rubricHints: string): Set<string> {
  return new Set(
    rubricHints.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 4),
  );
}

/**
 * Check if a slugified ref roughly corresponds to any rubric token.
 * The ref is the first 80 chars of the lowercased, slugified model output text.
 * A rubric token matches if it appears as a substring in the ref.
 */
function refMatchesAnyToken(ref: string, tokens: Set<string>): boolean {
  for (const token of tokens) {
    if (ref.includes(token) || token.includes(ref)) return true;
  }
  // Also check for multi-word overlap: if 2+ words from a token appear in the ref
  for (const token of tokens) {
    const tokenWords = token.split(/[^a-z0-9]+/).filter(Boolean);
    if (tokenWords.length >= 2 && tokenWords.every((w) => ref.includes(w))) return true;
  }
  return false;
}

describe("evidenceRefs E2E verification", () => {
  it("every rubric_token ref resolves to an actual rubric token or model evidence", async () => {
    const result = await evaluateV2(baseParams, new MockAIProvider());
    const rubricTokens = deriveRubricTokens(baseParams.rubricHints);

    // Combine rubric tokens + model evidenceFound/missingEvidence as valid targets
    const allValidTexts = [
      ...rubricTokens,
      ...result.content.evidenceFound.map((s) => s.toLowerCase()),
      ...result.content.missingEvidence.map((s) => s.toLowerCase()),
    ];

    const rubricRefs = result.evidenceRefs.filter((r) => r.kind === "rubric_token");
    expect(rubricRefs.length).toBeGreaterThan(0);

    for (const ref of rubricRefs) {
      const refText = ref.note?.toLowerCase() ?? ref.ref;
      const matches = allValidTexts.some(
        (valid) => refText.includes(valid) || valid.includes(refText) || refMatchesAnyToken(ref.ref, rubricTokens),
      );
      expect(matches).toBe(true);
    }
  });

  it("every metric ref has a valid name and value matching actual computed metrics", async () => {
    const result = await evaluateV2(baseParams, new MockAIProvider());
    const metricRefs = result.evidenceRefs.filter((r) => r.kind === "metric");

    expect(metricRefs.length).toBe(3);

    const expectedMetrics = computeDeliveryMetrics(baseParams.words, baseParams.durationMs);
    const expectedMap = new Map([
      ["speech_rate", expectedMetrics.speechRate],
      ["filler_rate", expectedMetrics.fillerRate],
      ["speaking_ratio", expectedMetrics.speakingRatio],
    ]);

    for (const ref of metricRefs) {
      const [metricName, valueStr] = ref.ref.split("=");
      expect(expectedMap.has(metricName!)).toBe(true);
      const actualValue = expectedMap.get(metricName!);
      expect(Number.parseFloat(valueStr!)).toBe(actualValue);
    }
  });

  it("no duplicate evidenceRef IDs exist", async () => {
    const result = await evaluateV2(baseParams, new MockAIProvider());
    const ids = result.evidenceRefs.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every evidenceRef has a non-empty note or quote for traceability", async () => {
    const result = await evaluateV2(baseParams, new MockAIProvider());
    for (const ref of result.evidenceRefs) {
      // Metric refs don't need notes (the ref itself is self-documenting)
      if (ref.kind === "metric") continue;
      // rubric_token refs must have a note with the evidence text
      expect((ref.note && ref.note.length > 0) || (ref.quote && ref.quote.length > 0)).toBe(true);
    }
  });

  it("metric refs are absent when timestamps are unavailable", async () => {
    const result = await evaluateV2(
      { ...baseParams, hasRealTimestamps: false },
      new MockAIProvider(),
    );
    const metricRefs = result.evidenceRefs.filter((r) => r.kind === "metric");
    expect(metricRefs.length).toBe(0);
    expect(result.delivery.availability).toBe("unavailable");
  });

  it("evidenceRefs cover both found and missing rubric points", async () => {
    // Use a transcript that covers SOME rubric points but not all
    const partialTranscript =
      "A database index uses a B-tree to speed up lookups. " +
      "The main benefit is faster reads.";
    const partialParams = {
      ...baseParams,
      transcript: partialTranscript,
      words: words(500, 400, partialTranscript.split(/\s+/)),
      durationMs: 500 + partialTranscript.split(/\s+/).length * 400,
    };
    const result = await evaluateV2(partialParams, new MockAIProvider());

    // Model should identify both found and missing points
    expect(result.content.evidenceFound.length).toBeGreaterThan(0);
    expect(result.content.missingEvidence.length).toBeGreaterThan(0);

    // evidenceRefs should include both found and missing refs
    const foundRefs = result.evidenceRefs.filter((r) => r.kind === "rubric_token" && !r.note?.startsWith("Missing:"));
    const missingRefs = result.evidenceRefs.filter((r) => r.kind === "rubric_token" && r.note?.startsWith("Missing:"));
    expect(foundRefs.length).toBeGreaterThan(0);
    expect(missingRefs.length).toBeGreaterThan(0);
  });
});
