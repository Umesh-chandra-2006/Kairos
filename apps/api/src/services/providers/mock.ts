import type {
  AIEvalHooks,
  AIEvalRequest,
  AIEvalResult,
  AIProvider,
  ASRProvider,
  ASRResult,
  ASRSegment,
  ASRTokensOpts,
  ASRWord,
  ChatJSONProvider,
  ChatJSONRequest,
} from "./types";

// ---------------------------------------------------------------------------
// Deterministic mock providers — no network, no API key, stable output.
// Used by tests, the benchmark harness, and local development without keys.
// ---------------------------------------------------------------------------

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const MOCK_MODEL_ANSWER =
  "A strong answer names the core concept up front, then walks through how it works step by step with a concrete example. It addresses the rubric points in order and closes by acknowledging the main trade-off. Depth is calibrated to the candidate's level: basics for a beginner, edge cases for an advanced candidate.";

/**
 * Deterministic V1-shape grader. Score derives from answer length relative to
 * the question's rubric-hint coverage so the same input always yields the same
 * evaluation — required for reproducible benchmark runs.
 */
export class MockAIProvider implements AIProvider, ChatJSONProvider {
  readonly name = "mock-ai";
  readonly modelVersion = "mock-1";

  /**
   * Deterministic V2 evaluator model: parses the evaluator's section markers
   * out of the prompt and returns contract-shaped content JSON derived from
   * rubric-token coverage. Same input always yields the same JSON.
   */
  async completeJSON(req: ChatJSONRequest): Promise<unknown> {
    const text = `${req.system}\n${req.user}`;
    const rubric = extractSection(text, "RUBRIC HINTS");
    const transcript = extractSection(text, "TRANSCRIPT").toLowerCase();
    const rubricTokens = [...new Set(
      rubric.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 4),
    )];
    const found = rubricTokens.filter((t) => transcript.includes(t));
    const missing = rubricTokens.filter((t) => !transcript.includes(t));
    const coverage = rubricTokens.length > 0 ? found.length / rubricTokens.length : 0.5;

    const contentBand = coverage >= 0.75 ? "strong" : coverage >= 0.4 ? "solid" : "needs_work";
    return {
      reasoning: `Mock evaluation: ${found.length}/${rubricTokens.length} rubric tokens found in transcript.`,
      contentBand,
      evidenceFound: found.slice(0, 6),
      missingEvidence: missing.slice(0, 6),
      misconceptions: [],
      strengths: [
        found.length > 0
          ? `Covered ${found.length} of the expected points (${found.slice(0, 3).join(", ")}).`
          : "Attempted the question with a structured attempt.",
      ],
      weaknesses:
        missing.length > 0
          ? [`Did not address: ${missing.slice(0, 3).join(", ")}.`]
          : ["Could tighten the explanation further."],
      organization: transcript.split(/\s+/).length > 40 ? "organized" : "loose",
      nextActionInstruction:
        missing.length > 0
          ? `Next attempt, cover the missing point "${missing[0]}" before closing.`
          : "Next attempt, add one concrete example to make the answer stronger.",
    };
  }

  async evaluate(req: AIEvalRequest, hooks?: AIEvalHooks): Promise<AIEvalResult> {
    const seed = hash(`${req.questionId}:${req.level}:${req.answerText}`);
    const lengthFactor = Math.min(req.answerText.length / 800, 1);
    const hintTokens = req.rubricHints
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length > 4);
    const hits = hintTokens.filter((w) => req.answerText.toLowerCase().includes(w)).length;
    const coverage = hintTokens.length > 0 ? hits / hintTokens.length : 0.5;

    // 3..9 deterministic band driven mostly by rubric coverage + length.
    const score = Math.max(1, Math.min(10, Math.round(2 + coverage * 5 + lengthFactor * 2 + (seed % 3) * 0.5)));

    const feedback = [
      `Coverage of rubric hints: ${(coverage * 100).toFixed(0)}%.`,
      hits > 0
        ? `You touched on: ${hintTokens.filter((w) => req.answerText.toLowerCase().includes(w)).slice(0, 3).join(", ")}.`
        : `None of the rubric hints were clearly addressed.`,
      lengthFactor < 0.5
        ? "The answer is thin — expand with a concrete example."
        : "Good depth; tighten the closing statement.",
    ].join(" ");

    // Stream in fixed-size chunks so SSE consumers get realistic token flow.
    const payload = JSON.stringify({ score, feedback, modelAnswer: MOCK_MODEL_ANSWER });
    if (hooks?.onToken) {
      for (let i = 0; i < payload.length; i += 24) {
        await hooks.onToken(payload.slice(i, i + 24));
      }
    }

    return { score, feedback, modelAnswer: MOCK_MODEL_ANSWER, provider: this.name, modelVersion: this.modelVersion };
  }
}

export interface MockASROpts extends ASRTokensOpts {
  /** Deterministic transcript to synthesize timestamps for. */
  transcript?: string;
  /** Total duration to spread words across (default 60s). */
  durationMs?: number;
}

/**
 * Synthesizes word-level timestamps from a transcript (or a canned default).
 * Words are evenly paced with periodic pauses so downstream delivery metrics
 * have realistic structure in tests.
 */
export class MockASRProvider implements ASRProvider {
  readonly name = "mock-asr";
  readonly modelVersion = "mock-whisper-1";

  async transcribe(audio: Buffer, _mimeType: string, opts?: MockASROpts): Promise<ASRResult> {
    const text = opts?.transcript ?? DEFAULT_MOCK_TRANSCRIPT;
    const durationMs = opts?.durationMs ?? estimateDurationMs(audio.length);
    const words = text.split(/\s+/).filter(Boolean);

    const speechBudget = Math.floor(durationMs * 0.85);
    const perWord = Math.max(120, Math.floor(speechBudget / Math.max(words.length, 1)));

    const asrWords: ASRWord[] = [];
    const segments: ASRSegment[] = [];
    let cursor = 500; // small start delay
    let segStart = cursor;
    let segText: string[] = [];

    words.forEach((word, i) => {
      const startMs = cursor;
      const endMs = cursor + perWord - 20;
      asrWords.push({ word, startMs, endMs, confidence: 0.9 + ((hash(word) % 8) / 100) });
      segText.push(word);
      cursor = endMs;
      // Insert a pause every ~12 words; close a segment there too.
      if ((i + 1) % 12 === 0) {
        cursor += 700 + (hash(word) % 900); // pause 0.7–1.6s
        segments.push({ startMs: segStart, endMs, text: segText.join(" ") });
        segStart = cursor;
        segText = [];
      }
    });
    if (segText.length > 0) segments.push({ startMs: segStart, endMs: cursor, text: segText.join(" ") });

    return {
      transcript: text,
      words: asrWords,
      segments,
      language: "en-IN",
      durationMs: Math.max(cursor, durationMs),
      provider: this.name,
      modelVersion: this.modelVersion,
    };
  }
}

const DEFAULT_MOCK_TRANSCRIPT =
  "So indexing is basically a data structure that lets the database find rows without scanning the whole table. " +
  "Think of it like a book index you look up the topic and jump straight to the page. " +
  "Most databases use B-trees because they keep lookups logarithmic even as data grows. " +
  "The trade-off is that every write has to update the index which slows down inserts a bit. " +
  "And if the query needs most of the table anyway the optimizer might skip the index entirely.";

function extractSection(text: string, marker: string): string {
  const start = text.indexOf(`${marker}:`);
  if (start === -1) return "";
  const rest = text.slice(start + marker.length + 1);
  const nextMarker = rest.search(/\n[A-Z][A-Z ]+:/);
  return (nextMarker === -1 ? rest : rest.slice(0, nextMarker)).trim();
}

/** Rough duration estimate assuming ~16kHz 16-bit mono (~32KB/s). Clamped to sane bounds. */
function estimateDurationMs(bytes: number): number {
  return Math.min(Math.max(Math.round((bytes / 32_000) * 1000), 5_000), 90_000);
}
