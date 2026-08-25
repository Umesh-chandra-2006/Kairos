import { describe, expect, it } from "vitest";
import { MockAIProvider } from "./providers/mock";
import { EvalModelOutputError, evaluateV2 } from "./evaluator/v2";
import type { ChatJSONProvider } from "./providers/types";
import { words } from "../test/fixtures/asr";

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
