import { describe, expect, it } from "vitest";
import {
  BANDS,
  EVALUATION_CONTRACT_VERSION,
  TERMINAL_SUBMISSION_STATUSES,
  canTransitionSubmission,
} from "../constants";
import {
  deriveOverallBand,
  evaluationResultSchema,
  languageCheckSchema,
  parseEvaluationResult,
  parseEvaluationResultStrict,
  type EvaluationResult,
} from "./evaluation";

const versions = {
  provider: "openrouter",
  model: "meta-llama/llama-3.1-8b-instruct",
  modelVersion: "2024-07",
  promptVersion: "content-eval@1",
  rubricVersion: "rubric@1",
  evaluatorVersion: "v2.0.0",
};

export function validEvaluation(overrides: Partial<Record<string, unknown>> = {}): EvaluationResult {
  return evaluationResultSchema.parse({
    contractVersion: EVALUATION_CONTRACT_VERSION,
    answerId: 42,
    kind: "initial",
    followUpOf: null,
    content: {
      band: "solid",
      source: "model",
      evidenceFound: ["explained index selectivity"],
      missingEvidence: ["write penalty trade-off"],
      misconceptions: [],
      strengths: ["used a concrete example"],
      weaknesses: ["no wrap-up of trade-offs"],
    },
    structure: {
      band: "needs_work",
      directness: { value: "buried", source: "deterministic" },
      organization: { value: "loose", source: "model" },
      repetition: { value: "high", source: "deterministic" },
      conclusion: { value: "missing", source: "deterministic" },
    },
    delivery: {
      band: "strong",
      source: "deterministic",
      speechRate: 132.5,
      fillerRate: 1.8,
      speakingRatio: 0.86,
      pauses: { count: 3, totalMs: 4200, longestMs: 2100, avgMs: 1400 },
      durationMs: 88_000,
    },
    overallBand: "needs_work",
    nextAction: {
      instruction:
        "Lead with the conclusion before explaining the implementation, then close with the trade-off.",
      focusDimension: "structure",
      focusBand: "needs_work",
    },
    evidenceRefs: [
      {
        id: "ev-1",
        dimension: "delivery",
        kind: "timestamp_range",
        ref: "12.3s-15.1s",
        note: "longest pause before the closing statement",
      },
      {
        id: "ev-2",
        dimension: "content",
        kind: "rubric_token",
        ref: "index-selectivity",
      },
    ],
    versions,
    createdAt: "2026-08-25T10:00:00.000Z",
    ...overrides,
  });
}

describe("evaluation contract", () => {
  it("accepts a fully valid evaluation", () => {
    const result = parseEvaluationResult(validEvaluation());
    expect(result).not.toBeNull();
    expect(result!.answerId).toBe(42);
    expect(result!.contractVersion).toBe(EVALUATION_CONTRACT_VERSION);
  });

  it("rejects an invalid band", () => {
    const bad = validEvaluation();
    (bad.content as { band: string }).band = "excellent";
    expect(parseEvaluationResult(bad)).toBeNull();
  });

  it("rejects a wrong contract version", () => {
    const bad = { ...validEvaluation(), contractVersion: 999 };
    expect(parseEvaluationResult(bad)).toBeNull();
  });

  it("rejects delivery metrics claiming model provenance", () => {
    const bad = validEvaluation();
    (bad.delivery as { source: string }).source = "model";
    expect(parseEvaluationResult(bad)).toBeNull();
  });

  it("rejects structure sub-scores without provenance tags", () => {
    const raw = validEvaluation() as unknown as Record<string, unknown>;
    raw.structure = {
      band: "solid",
      directness: "direct",
      organization: "organized",
      repetition: "low",
      conclusion: "clear",
    };
    expect(parseEvaluationResult(raw)).toBeNull();
  });

  it("rejects speech rate outside plausible human bounds", () => {
    const raw = validEvaluation() as unknown as Record<string, unknown>;
    raw.delivery = { ...(raw.delivery as object), speechRate: 900 };
    expect(parseEvaluationResult(raw)).toBeNull();
  });

  it("rejects a too-short or missing next action instruction", () => {
    const bad = validEvaluation();
    bad.nextAction.instruction = "Do better.";
    expect(parseEvaluationResult(bad)).toBeNull();
  });

  it("applies defaults for kind/followUpOf/evidenceRefs", () => {
    const raw = validEvaluation();
    const stripped = JSON.parse(JSON.stringify(raw));
    delete stripped.kind;
    delete stripped.followUpOf;
    delete stripped.evidenceRefs;
    const parsed = parseEvaluationResultStrict(stripped);
    expect(parsed.kind).toBe("initial");
    expect(parsed.followUpOf).toBeNull();
    expect(parsed.evidenceRefs).toEqual([]);
  });

  it("returns null on garbage input without throwing", () => {
    expect(parseEvaluationResult(null)).toBeNull();
    expect(parseEvaluationResult("banana")).toBeNull();
    expect(parseEvaluationResult({})).toBeNull();
    expect(parseEvaluationResult(undefined)).toBeNull();
  });

  it("accepts a follow-up evaluation linked to its parent", () => {
    const fu = validEvaluation({ kind: "follow_up", followUpOf: 41 });
    expect(parseEvaluationResult(fu)?.kind).toBe("follow_up");
  });
});

describe("deriveOverallBand", () => {
  it("weakest dimension dominates by default", () => {
    expect(deriveOverallBand("strong", "needs_work", "strong")).toBe("needs_work");
    expect(deriveOverallBand("solid", "solid", "strong")).toBe("solid");
  });

  it("upgrades two strong + one solid to strong", () => {
    expect(deriveOverallBand("strong", "strong", "solid")).toBe("strong");
  });

  it("never upgrades past a needs_work dimension", () => {
    expect(deriveOverallBand("strong", "strong", "needs_work")).toBe("needs_work");
  });

  it("covers every band value exhaustively", () => {
    for (const a of BANDS) for (const b of BANDS) for (const c of BANDS) {
      expect(BANDS).toContain(deriveOverallBand(a, b, c));
    }
  });
});

describe("submission state machine", () => {
  it("allows the happy path", () => {
    expect(canTransitionSubmission("created", "queued")).toBe(true);
    expect(canTransitionSubmission("queued", "processing")).toBe(true);
    expect(canTransitionSubmission("processing", "completed")).toBe(true);
  });

  it("allows retry from failed and requeue from processing", () => {
    expect(canTransitionSubmission("failed", "queued")).toBe(true);
    expect(canTransitionSubmission("failed", "cancelled")).toBe(true);
    expect(canTransitionSubmission("processing", "queued")).toBe(true);
  });

  it("forbids illegal jumps and terminal transitions", () => {
    expect(canTransitionSubmission("created", "completed")).toBe(false);
    expect(canTransitionSubmission("created", "processing")).toBe(false);
    expect(canTransitionSubmission("queued", "completed")).toBe(false);
    expect(canTransitionSubmission("completed", "queued")).toBe(false);
    expect(canTransitionSubmission("cancelled", "queued")).toBe(false);
  });

  it("marks completed and cancelled as terminal", () => {
    for (const terminal of TERMINAL_SUBMISSION_STATUSES) {
      for (const to of ["created", "queued", "processing", "completed", "failed", "cancelled"] as const) {
        expect(canTransitionSubmission(terminal, to)).toBe(false);
      }
    }
  });
});

describe("language gate schema", () => {
  it("accepts a suitable check with no reason", () => {
    expect(
      languageCheckSchema.safeParse({
        detectedLanguage: "en-IN",
        codeSwitchProbability: 0.08,
        suitable: true,
        rejectionReason: null,
      }).success,
    ).toBe(true);
  });

  it("requires bounded code-switch probability", () => {
    expect(
      languageCheckSchema.safeParse({
        detectedLanguage: "hi-en",
        codeSwitchProbability: 1.7,
        suitable: false,
        rejectionReason: "too much code-mixing to transcribe reliably",
      }).success,
    ).toBe(false);
  });
});
