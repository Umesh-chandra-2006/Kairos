import { describe, expect, it } from "vitest";
import { MockAIProvider } from "./providers/mock";
import { evaluateV2 } from "./evaluator/v2";
import { computeDeliveryMetrics, bandDelivery } from "./delivery";
import type { ASRWord } from "./providers/types";

/**
 * Full-pipeline corpus: runs the complete ASR → delivery → evaluateV2
 * pipeline for representative recording conditions.
 *
 * Unlike corpus.test.ts (which tests computeDeliveryMetrics in isolation),
 * this exercises the evaluator's integration: LLM judgment + deterministic
 * structure + deterministic delivery → canonical evaluation contract.
 *
 * All entries use MockAIProvider so results are deterministic.
 */

const RUBRIC =
  "Explain what a database index is; describe the B-tree data structure; " +
  "discuss the trade-off between read speed and write performance; " +
  "mention when the optimizer might skip the index";

const QUESTION = "What is a database index and what are its trade-offs?";

interface PipelineEntry {
  name: string;
  transcript: string;
  words: ASRWord[];
  durationMs: number;
  hasRealTimestamps: boolean;
  /** What we expect the evaluator to generally produce — not exact bands, but sanity checks. */
  expect: {
    overallBand?: "needs_work" | "solid" | "strong";
    contentBand?: "needs_work" | "solid" | "strong";
    deliveryAvailability?: "available" | "unavailable";
    evidenceRefCountMin?: number;
    evidenceRefCountMax?: number;
    hasDeliveryMetricRefs?: boolean;
    strengthsMinLength?: number;
    nextActionMinLength?: number;
  };
}

function makeWords(text: string, perWordMs: number, startMs = 0): ASRWord[] {
  return text.split(/\s+/).filter(Boolean).map((word, i) => ({
    word,
    startMs: startMs + i * perWordMs,
    endMs: startMs + i * perWordMs + Math.floor(perWordMs * 0.8),
    confidence: 0.9,
  }));
}

function makeWordsWithPauses(
  text: string,
  pauseAfterEvery: number,
  pauseMs: number,
  perWordMs = 300,
): ASRWord[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  const result: ASRWord[] = [];
  let cursor = 0;
  tokens.forEach((word, i) => {
    result.push({
      word,
      startMs: cursor,
      endMs: cursor + Math.floor(perWordMs * 0.8),
      confidence: 0.9,
    });
    cursor += perWordMs;
    if ((i + 1) % pauseAfterEvery === 0 && i < tokens.length - 1) {
      cursor += pauseMs;
    }
  });
  return result;
}

const pipelineCorpus: PipelineEntry[] = [
  {
    name: "ideal-answer-real-timestamps",
    transcript:
      "A database index is a B-tree data structure that lets lookups run in logarithmic time instead of scanning the whole table. " +
      "The main trade-off is the write penalty: every insert must also update the index. " +
      "And for queries that need most of the table anyway, the optimizer may skip the index entirely. " +
      "In summary, indexes speed up reads at the cost of slower writes and extra storage.",
    words: makeWordsWithPauses(
      "A database index is a B-tree data structure that lets lookups run in logarithmic time instead of scanning the whole table. The main trade-off is the write penalty every insert must also update the index. And for queries that need most of the table anyway the optimizer may skip the index entirely. In summary indexes speed up reads at the cost of slower writes and extra storage.",
      8, 800, 280,
    ),
    durationMs: 25_000,
    hasRealTimestamps: true,
    expect: {
      overallBand: "solid",
      deliveryAvailability: "available",
      evidenceRefCountMin: 5,
      evidenceRefCountMax: 40,
      hasDeliveryMetricRefs: true,
      strengthsMinLength: 1,
      nextActionMinLength: 20,
    },
  },
  {
    name: "ideal-answer-synthetic-timestamps",
    transcript:
      "A database index is a B-tree data structure that speeds up lookups. " +
      "The trade-off is that writes become slower because each insert updates the index. " +
      "For large scans the optimizer may choose a full table scan instead.",
    words: makeWords(
      "A database index is a B-tree data structure that speeds up lookups. The trade-off is that writes become slower because each insert updates the index. For large scans the optimizer may choose a full table scan instead.",
      300,
    ),
    durationMs: 18_000,
    hasRealTimestamps: false,
    expect: {
      overallBand: "solid",
      deliveryAvailability: "unavailable",
      evidenceRefCountMin: 3,
      hasDeliveryMetricRefs: false,
    },
  },
  {
    name: "weak-answer-real-timestamps",
    transcript: "I think indexes are like tables that make things fast. I am not sure about the details.",
    words: makeWords("I think indexes are like tables that make things fast. I am not sure about the details.", 400),
    durationMs: 5_000,
    hasRealTimestamps: true,
    expect: {
      overallBand: "needs_work",
      contentBand: "needs_work",
      evidenceRefCountMin: 1,
    },
  },
  {
    name: "filler-heavy-answer",
    transcript:
      "So like um basically a database index is um like a B-tree structure that um speeds up lookups. " +
      "The trade-off is um like slower writes because every insert um also updates the index.",
    words: (() => {
      const base = "So like um basically a database index is um like a B-tree structure that um speeds up lookups. The trade-off is um like slower writes because every insert um also updates the index.";
      const tokens = base.split(/\s+/);
      let cursor = 0;
      return tokens.map((word) => {
        const w = { word, startMs: cursor, endMs: cursor + 280, confidence: 0.9 };
        cursor += 350;
        return w;
      });
    })(),
    durationMs: 20_000,
    hasRealTimestamps: true,
    expect: {
      overallBand: "needs_work",
      deliveryAvailability: "available",
    },
  },
  {
    name: "very-short-answer",
    transcript: "Indexes are fast.",
    words: makeWords("Indexes are fast.", 400),
    durationMs: 2_000,
    hasRealTimestamps: true,
    expect: {
      overallBand: "needs_work",
      contentBand: "needs_work",
    },
  },
  {
    name: "long-answer-near-90s",
    transcript:
      "A database index is a data structure that improves the speed of data retrieval operations on a database table. " +
      "The most common type of index is the B-tree, which keeps data sorted and allows searches, sequential access, insertions, and deletions in logarithmic time. " +
      "The main trade-off is that each write operation must also update the index structure, which adds overhead to write-heavy workloads. " +
      "Additionally, indexes consume disk space. " +
      "Some database engines allow you to create composite indexes on multiple columns. " +
      "However, a composite index follows the leftmost prefix rule. " +
      "The query optimizer decides whether to use an index based on selectivity. " +
      "If a query returns a large fraction of the table, the optimizer may choose a full table scan instead.",
    words: makeWordsWithPauses(
      "A database index is a data structure that improves the speed of data retrieval operations on a database table. The most common type of index is the B-tree which keeps data sorted and allows searches sequential access insertions and deletions in logarithmic time. The main trade-off is that each write operation must also update the index structure which adds overhead to write-heavy workloads. Additionally indexes consume disk space. Some database engines allow you to create composite indexes on multiple columns. However a composite index follows the leftmost prefix rule. The query optimizer decides whether to use an index based on selectivity. If a query returns a large fraction of the table the optimizer may choose a full table scan instead.",
      6, 1000, 300,
    ),
    durationMs: 85_000,
    hasRealTimestamps: true,
    expect: {
      deliveryAvailability: "available",
      evidenceRefCountMin: 5,
    },
  },
  {
    name: "silence-only",
    transcript: "",
    words: [],
    durationMs: 10_000,
    hasRealTimestamps: true,
    expect: {
      overallBand: "needs_work",
      deliveryAvailability: "available",
    },
  },
  {
    name: "overlapping-timestamps",
    transcript:
      "An index is a B-tree structure. Lookups are logarithmic. Writes are slower.",
    words: (() => {
      const tokens = "An index is a B-tree structure. Lookups are logarithmic. Writes are slower.".split(/\s+/);
      const perWord = 300;
      const overlap = 90;
      return tokens.map((word, i) => ({
        word,
        startMs: i * (perWord - overlap),
        endMs: i * (perWord - overlap) + Math.floor(perWord * 0.8),
        confidence: 0.9,
      }));
    })(),
    durationMs: 8_000,
    hasRealTimestamps: true,
    expect: {
      deliveryAvailability: "available",
      // Speaking ratio should be reasonable despite overlaps (merged correctly)
    },
  },
];

describe("full pipeline: ASR → delivery → evaluateV2", () => {
  for (const entry of pipelineCorpus) {
    it(`${entry.name}`, async () => {
      const result = await evaluateV2(
        {
          answerId: 1,
          questionText: QUESTION,
          rubricHints: RUBRIC,
          level: "intermediate",
          transcript: entry.transcript,
          words: entry.words,
          durationMs: entry.durationMs,
          hasRealTimestamps: entry.hasRealTimestamps,
        },
        new MockAIProvider(),
      );

      // --- Contract invariants ---
      expect(result.contractVersion).toBe(1);
      expect(result.answerId).toBe(1);
      expect(["needs_work", "solid", "strong"]).toContain(result.overallBand);
      expect(["needs_work", "solid", "strong"]).toContain(result.content.band);
      expect(["needs_work", "solid", "strong"]).toContain(result.structure.band);
      expect(["needs_work", "solid", "strong"]).toContain(result.delivery.band);
      expect(result.delivery.source).toBe("deterministic");
      expect(result.content.source).toBe("model");

      // --- Delivery availability ---
      expect(result.delivery.availability).toBe(entry.expect.deliveryAvailability ?? "available");

      // --- EvidenceRefs ---
      const refCount = result.evidenceRefs.length;
      if (entry.expect.evidenceRefCountMin !== undefined) {
        expect(refCount).toBeGreaterThanOrEqual(entry.expect.evidenceRefCountMin);
      }
      if (entry.expect.evidenceRefCountMax !== undefined) {
        expect(refCount).toBeLessThanOrEqual(entry.expect.evidenceRefCountMax);
      }

      // Metric refs only when timestamps are real
      const metricRefs = result.evidenceRefs.filter((r) => r.kind === "metric");
      if (entry.expect.hasDeliveryMetricRefs === true) {
        expect(metricRefs.length).toBe(3);
      } else if (entry.expect.hasDeliveryMetricRefs === false) {
        expect(metricRefs.length).toBe(0);
      }

      // --- Content quality ---
      if (entry.expect.strengthsMinLength !== undefined) {
        expect(result.content.strengths.length).toBeGreaterThanOrEqual(entry.expect.strengthsMinLength);
      }

      // --- Next action ---
      expect(result.nextAction.instruction.length).toBeGreaterThanOrEqual(
        entry.expect.nextActionMinLength ?? 20,
      );
      expect(["content", "structure", "delivery"]).toContain(result.nextAction.focusDimension);

      // --- Band expectations (soft — mock provider is deterministic) ---
      if (entry.expect.overallBand !== undefined) {
        expect(result.overallBand).toBe(entry.expect.overallBand);
      }
      if (entry.expect.contentBand !== undefined) {
        expect(result.content.band).toBe(entry.expect.contentBand);
      }

      // --- Persistence would succeed (contract-valid) ---
      // The result must pass parseEvaluationResultStrict without throwing
      const { parseEvaluationResultStrict } = await import("@kairos/shared");
      expect(() => parseEvaluationResultStrict(result)).not.toThrow();
    });
  }
});

describe("full pipeline: delivery metrics integrity across pipeline", () => {
  it("delivery metrics from evaluateV2 match computeDeliveryMetrics for the same inputs", async () => {
    const words = makeWordsWithPauses(
      "A database index is a B-tree structure that speeds up reads. The trade-off is slower writes. B-trees keep data sorted.",
      4, 700, 280,
    );
    const durationMs = 15_000;

    const metrics = computeDeliveryMetrics(words, durationMs);
    const band = bandDelivery(metrics);

    const result = await evaluateV2(
      {
        answerId: 1,
        questionText: QUESTION,
        rubricHints: RUBRIC,
        level: "intermediate",
        transcript: "A database index is a B-tree structure that speeds up reads. The trade-off is slower writes. B-trees keep data sorted.",
        words,
        durationMs,
        hasRealTimestamps: true,
      },
      new MockAIProvider(),
    );

    expect(result.delivery.speechRate).toBe(metrics.speechRate);
    expect(result.delivery.fillerRate).toBe(metrics.fillerRate);
    expect(result.delivery.speakingRatio).toBe(metrics.speakingRatio);
    expect(result.delivery.pauses.count).toBe(metrics.pauses.count);
    expect(result.delivery.pauses.totalMs).toBe(metrics.pauses.totalMs);
    expect(result.delivery.pauses.longestMs).toBe(metrics.pauses.longestMs);
    expect(result.delivery.pauses.avgMs).toBe(metrics.pauses.avgMs);
    expect(result.delivery.band).toBe(band);
  });
});
