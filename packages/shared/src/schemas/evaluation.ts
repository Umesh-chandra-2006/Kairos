import { z } from "zod";
import {
  BANDS,
  EVALUATION_CONTRACT_VERSION,
  EVALUATION_SOURCES,
  SUBMISSION_STATUSES,
  type Band,
} from "../constants";

// ---------------------------------------------------------------------------
// Kairos V2 — Canonical Evaluation Contract (v1)
//
// One shared, versioned schema for the complete evaluation result. Every
// evaluator (content / structure / delivery) must produce output that
// validates against this contract before anything is persisted. The
// aggregator consumes validated evaluator outputs — never raw model responses.
// Invalid model output fails safely: parse helpers return `null`, callers
// retry or dead-letter, and garbage is never stored as a valid evaluation.
//
// Provenance rule: model-generated vs deterministic values are always
// distinguishable. Dimension-level provenance comes from `source`; mixed
// dimensions tag individual fields with `sourced()`.
// ---------------------------------------------------------------------------

const bandSchema = z.enum(BANDS);

const sourceSchema = z.enum(EVALUATION_SOURCES);

/** Wraps a value with explicit provenance. Required wherever a dimension mixes origins. */
function sourced<T extends z.ZodTypeAny>(value: T) {
  return z.object({ value, source: sourceSchema });
}

/** Version metadata recorded on every persisted evaluation row. */
export const evaluationVersionsSchema = z.object({
  provider: z.string().min(1).max(64),
  model: z.string().min(1).max(128),
  modelVersion: z.string().min(1).max(128),
  promptVersion: z.string().min(1).max(64),
  rubricVersion: z.string().min(1).max(64),
  evaluatorVersion: z.string().min(1).max(64),
});
export type EvaluationVersions = z.infer<typeof evaluationVersionsSchema>;

/** Pointer tying a conclusion back to the evidence that produced it. */
export const evidenceRefSchema = z.object({
  id: z.string().min(1).max(128),
  dimension: z.enum(["content", "structure", "delivery"]),
  kind: z.enum(["rubric_token", "transcript_segment", "timestamp_range", "metric"]),
  /** Machine-resolvable reference (rubric token id, transcript segment id, "12.3s-15.1s", metric key). */
  ref: z.string().min(1).max(256),
  /** Optional verbatim quote from the transcript supporting the conclusion. */
  quote: z.string().max(500).optional(),
  note: z.string().max(280).optional(),
});
export type EvidenceRef = z.infer<typeof evidenceRefSchema>;

// ---------------------------------------------------------------------------
// Content — LLM vs structured rubric. The model may not invent criteria; it
// reports which rubric tokens were demonstrated / missed.
// ---------------------------------------------------------------------------

export const contentDimensionSchema = z.object({
  band: bandSchema,
  source: z.literal("model"),
  evidenceFound: z.array(z.string().min(1).max(200)).max(30).default([]),
  missingEvidence: z.array(z.string().min(1).max(200)).max(30).default([]),
  misconceptions: z.array(z.string().min(1).max(300)).max(10).default([]),
  strengths: z.array(z.string().min(1).max(280)).max(8).default([]),
  weaknesses: z.array(z.string().min(1).max(280)).max(8).default([]),
});
export type ContentDimension = z.infer<typeof contentDimensionSchema>;

// ---------------------------------------------------------------------------
// Structure — LLM reasoning + deterministic transcript features. Sub-scores
// are individually tagged so the UI can show why each rating exists.
// ---------------------------------------------------------------------------

export const structureDimensionSchema = z.object({
  band: bandSchema,
  directness: sourced(z.enum(["buried", "mixed", "direct"])),
  organization: sourced(z.enum(["rambling", "loose", "organized"])),
  repetition: sourced(z.enum(["high", "moderate", "low"])),
  conclusion: sourced(z.enum(["missing", "weak", "clear"])),
});
export type StructureDimension = z.infer<typeof structureDimensionSchema>;

// ---------------------------------------------------------------------------
// Delivery — deterministic DSP/ASR-timestamp measurements only. The LLM never
// measures delivery. Numbers are observable signals, never psychological traits.
// ---------------------------------------------------------------------------

export const pauseMetricsSchema = z.object({
  count: z.number().int().min(0),
  totalMs: z.number().min(0),
  longestMs: z.number().min(0),
  avgMs: z.number().min(0),
});

export const deliveryDimensionSchema = z.object({
  band: bandSchema,
  source: z.literal("deterministic"),
  availability: z.enum(["available", "unavailable"]).default("available"),
  /** Words per minute across speaking time. 0 when timestamps are unavailable. */
  speechRate: z.number().min(0).max(400),
  /** Filler words per minute of total duration. 0 when timestamps are unavailable. */
  fillerRate: z.number().min(0).max(200),
  /** Speaking time / total duration, 0..1. 0 when timestamps are unavailable. */
  speakingRatio: z.number().min(0).max(1),
  pauses: pauseMetricsSchema,
  durationMs: z.number().int().min(0).max(90_000),
});
export type DeliveryDimension = z.infer<typeof deliveryDimensionSchema>;

// ---------------------------------------------------------------------------
// Next action — exactly one per evaluation. Direction over precision.
// ---------------------------------------------------------------------------

export const nextActionSchema = z.object({
  instruction: z.string().trim().min(20).max(220),
  focusDimension: z.enum(["content", "structure", "delivery"]),
  focusBand: bandSchema.optional(),
});
export type NextAction = z.infer<typeof nextActionSchema>;

// ---------------------------------------------------------------------------
// The complete canonical result
// ---------------------------------------------------------------------------

export const evaluationKindSchema = z.enum(["initial", "follow_up"]);
export type EvaluationKind = z.infer<typeof evaluationKindSchema>;

export const evaluationResultSchema = z.object({
  contractVersion: z.literal(EVALUATION_CONTRACT_VERSION),
  answerId: z.number().int().positive(),
  kind: evaluationKindSchema.default("initial"),
  followUpOf: z.number().int().positive().nullable().default(null),

  content: contentDimensionSchema,
  structure: structureDimensionSchema,
  delivery: deliveryDimensionSchema,

  overallBand: bandSchema,
  nextAction: nextActionSchema,

  evidenceRefs: z.array(evidenceRefSchema).max(50).default([]),

  versions: evaluationVersionsSchema,
  createdAt: z.string().datetime(),
});
export type EvaluationResult = z.infer<typeof evaluationResultSchema>;

// ---------------------------------------------------------------------------
// Language gate (English-only enforcement) — output of the ASR-stage check.
// Conservative: soft-reject only when clearly unsuitable for reliable grading.
// ---------------------------------------------------------------------------

export const languageCheckSchema = z.object({
  detectedLanguage: z.string().min(2).max(16),
  codeSwitchProbability: z.number().min(0).max(1),
  suitable: z.boolean(),
  rejectionReason: z.string().max(280).nullable(),
});
export type LanguageCheck = z.infer<typeof languageCheckSchema>;

// ---------------------------------------------------------------------------
// Fail-safe parsing helpers — the only way model output enters the system.
// ---------------------------------------------------------------------------

/** Parse untrusted evaluator/model output into the contract. Returns null on any failure. */
export function parseEvaluationResult(raw: unknown): EvaluationResult | null {
  const parsed = evaluationResultSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Strict variant for internal boundaries where invalid data must throw. */
export function parseEvaluationResultStrict(raw: unknown): EvaluationResult {
  return evaluationResultSchema.parse(raw);
}

/**
 * Derive the overall band from the three dimension bands using a fixed,
 * explainable rule: the weakest dimension dominates, with a single upgrade
 * path (two strong + one solid ⇒ strong).
 */
export function deriveOverallBand(
  content: Band,
  structure: Band,
  delivery: Band,
): Band {
  const rank: Record<Band, number> = { needs_work: 0, solid: 1, strong: 2 };
  const bands = [content, structure, delivery];
  const minRank = Math.min(...bands.map((b) => rank[b]));
  if (minRank === rank.solid && bands.filter((b) => b === "strong").length === 2) {
    return "strong";
  }
  return (Object.keys(rank) as Band[]).find((b) => rank[b] === minRank)!;
}
