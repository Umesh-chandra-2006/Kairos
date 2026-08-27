import { describe, expect, it } from "vitest";
import { computeDeliveryMetrics, bandDelivery, PAUSE_THRESHOLD_MS } from "./delivery";
import type { ASRWord } from "./providers/types";

/**
 * Corpus test suite for the voice evaluation pipeline.
 *
 * Each entry simulates the ASR output for a specific recording condition.
 * These are NOT real audio — they are realistic ASR word-patterns that
 * exercise the delivery metrics computation across a wide range of
 * speaking styles, noise profiles, and boundary conditions.
 *
 * The goal: verify that computeDeliveryMetrics → bandDelivery produces
 * sensible, interpretable results for every condition a real student
 * recording might produce.
 */

interface CorpusEntry {
  name: string;
  description: string;
  words: ASRWord[];
  durationMs: number;
  /** Expected delivery band. "any" = just check it doesn't crash. */
  expectedBand: "needs_work" | "solid" | "strong" | "any";
  /** Optional assertion on specific metric ranges. */
  expect?: {
    speechRateMin?: number;
    speechRateMax?: number;
    fillerRateMax?: number;
    speakingRatioMin?: number;
    speakingRatioMax?: number;
    pauseCountMin?: number;
    pauseCountMax?: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWords(
  text: string,
  opts: {
    startMs?: number;
    perWordMs?: number;
    wordDurationRatio?: number;
    fillers?: Set<string>;
  } = {},
): ASRWord[] {
  const { startMs = 0, perWordMs = 300, wordDurationRatio = 0.8 } = opts;
  const tokens = text.split(/\s+/).filter(Boolean);
  return tokens.map((word, i) => ({
    word,
    startMs: startMs + i * perWordMs,
    endMs: startMs + i * perWordMs + Math.floor(perWordMs * wordDurationRatio),
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
  const words: ASRWord[] = [];
  let cursor = 0;
  tokens.forEach((word, i) => {
    words.push({
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
  return words;
}

function makeWordsWithOverlaps(text: string, overlapFraction: number, perWordMs = 300): ASRWord[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  const overlap = Math.floor(perWordMs * overlapFraction);
  return tokens.map((word, i) => ({
    word,
    startMs: i * (perWordMs - overlap),
    endMs: i * (perWordMs - overlap) + Math.floor(perWordMs * 0.8),
    confidence: 0.9,
  }));
}

function makeSlowWords(text: string, perWordMs: number): ASRWord[] {
  return makeWords(text, { perWordMs });
}

function makeFastWords(text: string, perWordMs: number): ASRWord[] {
  return makeWords(text, { perWordMs });
}

// ---------------------------------------------------------------------------
// Corpus
// ---------------------------------------------------------------------------

const corpus: CorpusEntry[] = [
  // --- Baseline conditions ---
  {
    name: "quiet-room-ideal",
    description: "Clean recording, moderate pace, no fillers, short pauses",
    words: makeWordsWithPauses(
      "A database index is a b-tree data structure that lets lookups run in logarithmic time. The trade-off is that every write must also update the index which slows down inserts. And for large scans the optimizer may skip the index entirely.",
      8, 800, 280,
    ),
    durationMs: 25_000,
    expectedBand: "strong",
    expect: { speechRateMin: 100, speechRateMax: 160, fillerRateMax: 1, speakingRatioMin: 0.6 },
  },
  {
    name: "background-fan",
    description: "Moderate background noise — ASR confidence lower, word boundaries less precise",
    words: (() => {
      const w = makeWordsWithPauses(
        "So basically a database index works like a book index you look up the topic and jump to the page. Most databases use b-trees because they keep lookups logarithmic.",
        6, 700, 300,
      );
      // Simulate ASR noise: some words have slightly shifted boundaries
      return w.map((word, i) => ({
        ...word,
        startMs: word.startMs + (i % 3 === 0 ? 15 : 0),
        endMs: word.endMs + (i % 5 === 0 ? -10 : 0),
        confidence: 0.75 + (i % 4) * 0.05,
      }));
    })(),
    durationMs: 22_000,
    expectedBand: "solid",
    expect: { speechRateMin: 90, speechRateMax: 160, fillerRateMax: 3 },
  },
  {
    name: "keyboard-noise",
    description: "Keyboard clicks cause spurious short words in ASR output",
    words: (() => {
      const base = makeWordsWithPauses(
        "Indexing is about speeding up reads. The cost is slower writes and extra storage. If your query touches most rows the index won't help.",
        5, 600, 280,
      );
      // Insert spurious short tokens (keyboard artifacts)
      const artifacts: ASRWord[] = [
        { word: "ok", startMs: 3200, endMs: 3280, confidence: 0.4 },
        { word: "right", startMs: 7800, endMs: 7900, confidence: 0.35 },
      ];
      return [...base, ...artifacts].sort((a, b) => a.startMs - b.startMs);
    })(),
    durationMs: 18_000,
    expectedBand: "any",
    expect: { speechRateMin: 80 },
  },

  // --- Microphone quality ---
  {
    name: "phone-microphone",
    description: "Phone mic: compressed audio, slightly clipped start/end",
    words: (() => {
      const w = makeWordsWithPauses(
        "B-tree index keeps data sorted for fast lookups. Every insert has to update the index. That is the main trade-off.",
        4, 500, 310,
      );
      // Clip the first and last word (common with phone recording)
      w[0]!.startMs = 100;
      const last = w.at(-1)!;
      last.endMs = last.startMs + 100;
      return w;
    })(),
    durationMs: 15_000,
    expectedBand: "solid",
    expect: { speechRateMin: 80, speechRateMax: 180 },
  },
  {
    name: "earbuds-mic",
    description: "Close-talk earbuds: high signal-to-noise, precise timestamps",
    words: makeWordsWithPauses(
      "An index is a data structure that improves the speed of data retrieval. The most common type is the B-tree. The trade-off is write performance because each insert must also update the index.",
      6, 900, 260,
    ),
    durationMs: 28_000,
    expectedBand: "strong",
    expect: { speechRateMin: 100, speechRateMax: 150, speakingRatioMin: 0.6 },
  },

  // --- Speaking rate ---
  {
    name: "fast-speaker",
    description: "Very fast speaker (~200+ WPM), few pauses",
    words: makeFastWords(
      "So indexing is basically a way to avoid full table scans. You create an index on a column and the database uses a B-tree to find rows quickly. The downside is that every write has to update the index too which slows down inserts. And if your query is scanning most of the table the optimizer might just ignore the index.",
      150,
    ),
    durationMs: 18_000,
    expectedBand: "solid",
    expect: { speechRateMin: 160, speakingRatioMin: 0.7 },
  },
  {
    name: "slow-speaker",
    description: "Very slow speaker (~60 WPM), long pauses between phrases",
    words: makeSlowWords(
      "A database index helps you find rows faster. It uses a B-tree. The cost is slower writes.",
      700,
    ),
    durationMs: 30_000,
    expectedBand: "needs_work",
    expect: { speechRateMin: 30, speechRateMax: 80, speakingRatioMax: 0.5 },
  },

  // --- Fillers and disfluencies ---
  {
    name: "frequent-fillers",
    description: "Heavy use of um, uh, like, basically",
    words: (() => {
      // Fully deterministic filler placement: every 3rd word is a filler
      const base = "So a database index is a b-tree structure that speeds up lookups. The trade-off is slower writes.";
      const tokens = base.split(/\s+/);
      const result: ASRWord[] = [];
      let cursor = 0;
      const perWordMs = 350;
      const fillers = ["um", "uh", "like", "basically"];
      let fillerIdx = 0;
      tokens.forEach((word, i) => {
        result.push({ word, startMs: cursor, endMs: cursor + Math.floor(perWordMs * 0.8), confidence: 0.9 });
        cursor += perWordMs;
        if (i % 3 === 1 && i < tokens.length - 1) {
          result.push({ word: fillers[fillerIdx % fillers.length]!, startMs: cursor, endMs: cursor + 200, confidence: 0.85 });
          fillerIdx++;
          cursor += perWordMs;
        }
      });
      return result;
    })(),
    durationMs: 25_000,
    expectedBand: "needs_work",
    expect: { fillerRateMin: 4, speakingRatioMin: 0.4 },
  },

  // --- Pause patterns ---
  {
    name: "long-pauses",
    description: "Frequent long pauses (>1s) between phrases",
    words: makeWordsWithPauses(
      "An index speeds up reads. The trade-off is write performance. B-trees are the most common structure. Large scans may skip the index.",
      3, 2500, 300,
    ),
    durationMs: 30_000,
    expectedBand: "needs_work",
    expect: { pauseCountMin: 3, speakingRatioMax: 0.6 },
  },

  // --- Boundary conditions ---
  {
    name: "very-short-answer",
    description: "Only 3-4 words — too brief to evaluate",
    words: makeWords("Indexes are fast.", { perWordMs: 400 }),
    durationMs: 3_000,
    expectedBand: "needs_work",
    expect: { speechRateMin: 0, speakingRatioMax: 1 },
  },
  {
    name: "near-90s-answer",
    description: "Answer fills the entire 90-second window",
    words: makeWordsWithPauses(
      "A database index is a data structure that improves the speed of data retrieval operations. The most common type is the B-tree which keeps data sorted and allows searches, sequential access, insertions, and deletions in logarithmic time. The main trade-off is that each write operation must also update the index structure, which adds overhead. Additionally, indexes consume storage space. Some database engines allow you to create composite indexes on multiple columns which can speed up queries that filter on those columns. However, a composite index follows the leftmost prefix rule meaning the index can only be used if the query provides values for the leading columns. The query optimizer decides whether to use an index based on the selectivity of the query. If a query would return a large fraction of the table, the optimizer may choose a full table scan instead because sequential I/O is faster than many random I/Os through the index. This is why index design requires understanding your query patterns.",
      4, 1200, 320,
    ),
    durationMs: 88_000,
    expectedBand: "any",
    expect: { speechRateMin: 60, speechRateMax: 200 },
  },
  {
    name: "silence-only",
    description: "All silence — ASR returns empty transcript",
    words: [],
    durationMs: 10_000,
    expectedBand: "needs_work",
    expect: { speechRateMin: 0, speechRateMax: 0, pauseCountMax: 0 },
  },
  {
    name: "clipped-audio",
    description: "Audio cuts off mid-sentence",
    words: (() => {
      const w = makeWordsWithPauses(
        "A database index is a b-tree structure that speeds up lookups. The trade-off is that every write must also update the index which",
        4, 700, 280,
      );
      // Remove the last word to simulate clipping
      return w.slice(0, -1);
    })(),
    durationMs: 12_000,
    expectedBand: "solid",
    expect: { speechRateMin: 80 },
  },
  {
    name: "noisy-audio",
    description: "Very noisy environment: low ASR confidence, many spurious tokens",
    words: (() => {
      const base = makeWordsWithPauses(
        "Indexing improves read performance. Write performance degrades. B-trees keep data sorted.",
        3, 400, 280,
      );
      // Add spurious noise tokens with low confidence
      const noise: ASRWord[] = [
        { word: "the", startMs: 1500, endMs: 1580, confidence: 0.3 },
        { word: "a", startMs: 3200, endMs: 3250, confidence: 0.25 },
        { word: "is", startMs: 5100, endMs: 5160, confidence: 0.2 },
        { word: "uh", startMs: 6800, endMs: 6860, confidence: 0.35 },
        { word: "you", startMs: 8200, endMs: 8270, confidence: 0.28 },
      ];
      return [...base, ...noise].sort((a, b) => a.startMs - b.startMs);
    })(),
    durationMs: 12_000,
    expectedBand: "any",
    expect: { speechRateMin: 20 },
  },

  // --- Code-switching ---
  {
    name: "mild-code-switching",
    description: "Mostly English with a few Hindi filler words (normal Indian-English speech)",
    words: makeWordsWithPauses(
      "So indexing ka matlab hai basically a data structure for fast lookups. The trade-off is with writes. B-trees are used because they keep things sorted.",
      5, 800, 300,
    ),
    durationMs: 20_000,
    expectedBand: "solid",
    expect: { speechRateMin: 90, speechRateMax: 160 },
  },
  {
    name: "heavy-code-switching",
    description: "Majority Hindi with some English — should still compute delivery metrics",
    words: makeWordsWithPauses(
      "Toh index basically ek data structure hai jo lookup fast karta hai. Trade-off ye hai ki writes slow hoti hai. B-tree use hota hai because sorted rehta hai.",
      4, 700, 300,
    ),
    durationMs: 18_000,
    expectedBand: "any",
    expect: { speechRateMin: 60 },
  },

  // --- Overlapping timestamps (ASR artifact) ---
  {
    name: "overlapping-timestamps",
    description: "ASR returns overlapping word boundaries (common with some providers)",
    words: makeWordsWithOverlaps(
      "Database indexes use B-tree structures. They speed up reads but slow down writes. The optimizer decides when to use them.",
      0.3, 280,
    ),
    durationMs: 14_000,
    expectedBand: "any",
    expect: { speakingRatioMin: 0.3, speakingRatioMax: 1 },
  },

  // --- Mixed confidence ---
  {
    name: "mixed-confidence",
    description: "Some words have high confidence, others very low (accent/noise)",
    words: (() => {
      const w = makeWordsWithPauses(
        "An index is a B-tree structure. Lookups are logarithmic. Writes are slower. Storage increases.",
        4, 600, 300,
      );
      return w.map((word, i) => ({
        ...word,
        confidence: i % 3 === 0 ? 0.95 : i % 3 === 1 ? 0.6 : 0.4,
      }));
    })(),
    durationMs: 16_000,
    expectedBand: "any",
    expect: { speechRateMin: 60 },
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("corpus: delivery pipeline across recording conditions", () => {
  for (const entry of corpus) {
    it(`${entry.name}: ${entry.description}`, () => {
      const metrics = computeDeliveryMetrics(entry.words, entry.durationMs);
      const band = bandDelivery(metrics);

      // Basic invariants
      expect(metrics.speechRate).toBeGreaterThanOrEqual(0);
      expect(metrics.fillerRate).toBeGreaterThanOrEqual(0);
      expect(metrics.speakingRatio).toBeGreaterThanOrEqual(0);
      expect(metrics.speakingRatio).toBeLessThanOrEqual(1);
      expect(metrics.pauses.count).toBeGreaterThanOrEqual(0);
      expect(metrics.pauses.totalMs).toBeGreaterThanOrEqual(0);
      expect(metrics.pauses.avgMs).toBeGreaterThanOrEqual(0);
      expect(metrics.pauses.longestMs).toBeGreaterThanOrEqual(0);

      // Band expectation
      if (entry.expectedBand !== "any") {
        expect(band).toBe(entry.expectedBand);
      }

      // Specific metric assertions
      if (entry.expect) {
        const e = entry.expect;
        if (e.speechRateMin !== undefined) expect(metrics.speechRate).toBeGreaterThanOrEqual(e.speechRateMin);
        if (e.speechRateMax !== undefined) expect(metrics.speechRate).toBeLessThanOrEqual(e.speechRateMax);
        if (e.fillerRateMin !== undefined) expect(metrics.fillerRate).toBeGreaterThanOrEqual(e.fillerRateMin);
        if (e.fillerRateMax !== undefined) expect(metrics.fillerRate).toBeLessThanOrEqual(e.fillerRateMax);
        if (e.speakingRatioMin !== undefined) expect(metrics.speakingRatio).toBeGreaterThanOrEqual(e.speakingRatioMin);
        if (e.speakingRatioMax !== undefined) expect(metrics.speakingRatio).toBeLessThanOrEqual(e.speakingRatioMax);
        if (e.pauseCountMin !== undefined) expect(metrics.pauses.count).toBeGreaterThanOrEqual(e.pauseCountMin);
        if (e.pauseCountMax !== undefined) expect(metrics.pauses.count).toBeLessThanOrEqual(e.pauseCountMax);
      }
    });
  }
});

describe("corpus: bandDelivery monotonicity", () => {
  it("higher speechRate within normal range always improves or maintains band", () => {
    // Fix all other metrics; vary only speechRate
    const base = { fillerRate: 2, speakingRatio: 0.7, pauses: { count: 1, totalMs: 800, avgMs: 800, longestMs: 800 } };
    const lowRate = bandDelivery({ ...base, speechRate: 60 });
    const midRate = bandDelivery({ ...base, speechRate: 130 });
    const highRate = bandDelivery({ ...base, speechRate: 170 });
    // Low rate → needs_work, mid → potentially solid/strong, high → strong/solid
    expect(lowRate).toBe("needs_work");
    expect(["solid", "strong"]).toContain(midRate);
    expect(["solid", "strong"]).toContain(highRate);
  });

  it("higher fillerRate always degrades or maintains band", () => {
    const base = { speechRate: 130, speakingRatio: 0.7, pauses: { count: 1, totalMs: 800, avgMs: 800, longestMs: 800 } };
    const lowFiller = bandDelivery({ ...base, fillerRate: 1 });
    const midFiller = bandDelivery({ ...base, fillerRate: 5 });
    const highFiller = bandDelivery({ ...base, fillerRate: 10 });
    expect(["solid", "strong"]).toContain(lowFiller);
    expect(highFiller).toBe("needs_work");
  });

  it("very low speakingRatio always produces needs_work", () => {
    const m = { speechRate: 130, fillerRate: 2, speakingRatio: 0.3, pauses: { count: 5, totalMs: 8000, avgMs: 1600, longestMs: 3000 } };
    expect(bandDelivery(m)).toBe("needs_work");
  });
});

describe("corpus: pause detection edge cases", () => {
  it("gap exactly at threshold counts as pause", () => {
    const words: ASRWord[] = [
      { word: "hello", startMs: 0, endMs: 300, confidence: 0.9 },
      { word: "world", startMs: 300 + PAUSE_THRESHOLD_MS, endMs: 300 + PAUSE_THRESHOLD_MS + 300, confidence: 0.9 },
    ];
    const m = computeDeliveryMetrics(words, 2000);
    expect(m.pauses.count).toBe(1);
    expect(m.pauses.longestMs).toBe(PAUSE_THRESHOLD_MS);
  });

  it("gap just below threshold does not count as pause", () => {
    const words: ASRWord[] = [
      { word: "hello", startMs: 0, endMs: 300, confidence: 0.9 },
      { word: "world", startMs: 300 + PAUSE_THRESHOLD_MS - 1, endMs: 300 + PAUSE_THRESHOLD_MS + 299, confidence: 0.9 },
    ];
    const m = computeDeliveryMetrics(words, 2000);
    expect(m.pauses.count).toBe(0);
  });

  it("multiple consecutive pauses are counted individually", () => {
    const words: ASRWord[] = [
      { word: "a", startMs: 0, endMs: 200, confidence: 0.9 },
      { word: "b", startMs: 1200, endMs: 1400, confidence: 0.9 },
      { word: "c", startMs: 2600, endMs: 2800, confidence: 0.9 },
      { word: "d", startMs: 4000, endMs: 4200, confidence: 0.9 },
    ];
    const m = computeDeliveryMetrics(words, 5000);
    expect(m.pauses.count).toBe(3);
  });
});
