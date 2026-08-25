import { z } from "zod";
import {
  EVALUATION_CONTRACT_VERSION,
  deriveOverallBand,
  evaluationVersionsSchema,
  parseEvaluationResultStrict,
  type Band,
  type EvaluationResult,
} from "@kairos/shared";
import type { DB } from "@kairos/db/client";
import { answers, evaluationVersions } from "@kairos/db/schema";
import { eq } from "drizzle-orm";
import { bandDelivery, computeDeliveryMetrics } from "../delivery";
import { checkLanguage } from "../language";
import type { ASRWord, ChatJSONProvider } from "../providers/types";

export const EVALUATOR_VERSION = "v2-evaluator@1";
export const PROMPT_VERSION = "content-eval@1";
export const RUBRIC_VERSION = "rubric@1";

/**
 * The part of the contract the LLM is allowed to produce: content evidence +
 * flow judgment + the coaching instruction. Everything else is assembled or
 * measured deterministically and merged around this output (build-plan §6).
 */
const modelPartSchema = z.object({
  contentBand: z.enum(["needs_work", "solid", "strong"]),
  evidenceFound: z.array(z.string().min(1).max(200)).max(30),
  missingEvidence: z.array(z.string().min(1).max(200)).max(30),
  misconceptions: z.array(z.string().min(1).max(300)).max(10),
  strengths: z.array(z.string().min(1).max(280)).max(8),
  weaknesses: z.array(z.string().min(1).max(280)).max(8),
  organization: z.enum(["rambling", "loose", "organized"]),
  nextActionInstruction: z.string().trim().min(20).max(220),
});
type ModelPart = z.infer<typeof modelPartSchema>;

const SYSTEM_PROMPT = `You are a senior technical interviewer grading a spoken interview answer.

You receive the question, the rubric hints a strong answer must cover, the candidate's level, and the verbatim transcript of their spoken response.

Return STRICT JSON only (no markdown fences) with exactly these keys:
{
  "contentBand": "needs_work" | "solid" | "strong",
  "evidenceFound": ["rubric points the candidate clearly demonstrated"],
  "missingEvidence": ["rubric points not addressed"],
  "misconceptions": ["factually wrong claims, empty if none"],
  "strengths": ["specific things done well, referencing the transcript"],
  "weaknesses": ["specific gaps, referencing the transcript"],
  "organization": "rambling" | "loose" | "organized",
  "nextActionInstruction": "one concrete drill-style instruction for the next attempt, max 220 chars"
}

Rules:
- Calibrate to the candidate's level: beginners earn credit for clean basics; advanced candidates must cover trade-offs.
- Do not invent rubric points beyond the hints given.
- The transcript is spoken language: ignore filler words when judging content.`;

export interface EvaluateV2Params {
  answerId: number;
  questionText: string;
  rubricHints: string;
  level: string;
  transcript: string;
  words: ASRWord[];
  durationMs: number;
}

export class EvalModelOutputError extends Error {
  readonly retryable = true;
  constructor() {
    super("Evaluator model returned unusable output");
    this.name = "EvalModelOutputError";
  }
}

/** Deterministic structure sub-scores computed from the transcript text only. */
function directness(transcript: string, rubricTokens: string[]): { value: "buried" | "mixed" | "direct"; source: "deterministic" } {
  const opening = transcript.toLowerCase().split(/\s+/).slice(0, 15).join(" ");
  const early = transcript.toLowerCase().split(/\s+/).slice(0, 45).join(" ");
  const hits = (text: string) => rubricTokens.some((t) => text.includes(t));
  if (hits(opening)) return { value: "direct", source: "deterministic" };
  if (hits(early)) return { value: "mixed", source: "deterministic" };
  return { value: "buried", source: "deterministic" };
}

function repetition(transcript: string): { value: "high" | "moderate" | "low"; source: "deterministic" } {
  const tokens = transcript.toLowerCase().split(/[^\p{L}]+/u).filter((t) => t.length > 3);
  if (tokens.length < 12) return { value: "moderate", source: "deterministic" };
  const ratio = new Set(tokens).size / tokens.length;
  if (ratio >= 0.62) return { value: "low", source: "deterministic" };
  if (ratio >= 0.45) return { value: "moderate", source: "deterministic" };
  return { value: "high", source: "deterministic" };
}

const CLOSING_MARKERS = ["in summary", "to conclude", "to sum up", "overall,", "so overall", "that's why", "that is why", "in short"];
const WEAK_CLOSERS = ["so yeah", "so, yeah", "anyway", "i think that's", "so that's"];

function conclusion(transcript: string): { value: "missing" | "weak" | "clear"; source: "deterministic" } {
  const tail = transcript.toLowerCase().slice(-220);
  if (CLOSING_MARKERS.some((m) => tail.includes(m))) return { value: "clear", source: "deterministic" };
  if (WEAK_CLOSERS.some((m) => tail.includes(m))) return { value: "weak", source: "deterministic" };
  return { value: "missing", source: "deterministic" };
}

function structureBand(subs: {
  directness: string;
  organization: string;
  repetition: string;
  conclusion: string;
}): Band {
  const map: Record<string, number> = {
    direct: 2, mixed: 1, buried: 0,
    organized: 2, loose: 1, rambling: 0,
    low: 2, moderate: 1, high: 0,
    clear: 2, weak: 1, missing: 0,
  };
  const total =
    map[subs.directness]! + map[subs.organization]! + map[subs.repetition]! + map[subs.conclusion]!;
  if (total >= 6) return "strong";
  if (total >= 3) return "solid";
  return "needs_work";
}

/**
 * Full V2 evaluation: deterministic measurements + one structured LLM call,
 * merged into the canonical EvaluationContract payload. Throws
 * EvalModelOutputError (retryable) when the model cannot produce valid JSON.
 */
export async function evaluateV2(
  params: EvaluateV2Params,
  model: ChatJSONProvider,
): Promise<EvaluationResult> {
  const language = checkLanguage(params.transcript);

  const metrics = computeDeliveryMetrics(params.words, params.durationMs);
  const deliveryBand = bandDelivery(metrics);
  const delivery = {
    band: deliveryBand,
    source: "deterministic" as const,
    speechRate: metrics.speechRate,
    fillerRate: metrics.fillerRate,
    speakingRatio: metrics.speakingRatio,
    pauses: metrics.pauses,
    durationMs: params.durationMs,
  };

  const rubricTokens = [...new Set(
    params.rubricHints.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 4),
  )];

  const userPrompt = [
    `QUESTION: ${params.questionText}`,
    `RUBRIC HINTS: ${params.rubricHints}`,
    `CANDIDATE LEVEL: ${params.level}`,
    `TRANSCRIPT: ${params.transcript}`,
  ].join("\n\n");

  const parseAttempt = async (extra: string): Promise<ModelPart> => {
    const raw = await model.completeJSON({
      system: SYSTEM_PROMPT,
      user: extra ? `${userPrompt}\n\n${extra}` : userPrompt,
    });
    const parsed = modelPartSchema.safeParse(raw);
    if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
    return parsed.data;
  };

  let mp: ModelPart;
  try {
    mp = await parseAttempt("");
  } catch {
    try {
      mp = await parseAttempt(
        'Your previous reply was not valid JSON for the required schema. Reply again with ONLY the JSON object with exactly the requested keys.',
      );
    } catch {
      throw new EvalModelOutputError();
    }
  }

  const detDirectness = directness(params.transcript, rubricTokens);
  const detRepetition = repetition(params.transcript);
  const detConclusion = conclusion(params.transcript);
  const sBand = structureBand({
    directness: detDirectness.value,
    organization: mp.organization,
    repetition: detRepetition.value,
    conclusion: detConclusion.value,
  });

  const focusCandidates: Array<{ dimension: "content" | "structure" | "delivery"; band: Band }> = [
    { dimension: "content", band: mp.contentBand },
    { dimension: "structure", band: sBand },
    { dimension: "delivery", band: deliveryBand },
  ];
  const weakest = [...focusCandidates].sort(
    (a, b) => BAND_ORDER[a.band] - BAND_ORDER[b.band] || DIMENSION_PRIORITY[a.dimension] - DIMENSION_PRIORITY[b.dimension],
  )[0]!;

  const result: EvaluationResult = {
    contractVersion: EVALUATION_CONTRACT_VERSION,
    answerId: params.answerId,
    kind: "initial",
    followUpOf: null,
    content: {
      band: mp.contentBand,
      source: "model",
      evidenceFound: mp.evidenceFound,
      missingEvidence: mp.missingEvidence,
      misconceptions: mp.misconceptions,
      strengths: mp.strengths,
      weaknesses: mp.weaknesses,
    },
    structure: {
      band: sBand,
      directness: detDirectness,
      organization: { value: mp.organization, source: "model" },
      repetition: detRepetition,
      conclusion: detConclusion,
    },
    delivery,
    overallBand: deriveOverallBand(mp.contentBand, sBand, deliveryBand),
    nextAction: {
      instruction: mp.nextActionInstruction,
      focusDimension: weakest.dimension,
      focusBand: weakest.band,
    },
    evidenceRefs: [],
    versions: evaluationVersionsSchema.parse({
      provider: model.name,
      model: model.name === "openrouter" ? "chat-json" : model.name,
      modelVersion: model.modelVersion,
      promptVersion: PROMPT_VERSION,
      rubricVersion: RUBRIC_VERSION,
      evaluatorVersion: EVALUATOR_VERSION,
    }),
    createdAt: new Date().toISOString(),
  };

  // Internal assembly must satisfy the contract unconditionally.
  return parseEvaluationResultStrict(result);
}

const BAND_ORDER: Record<Band, number> = { needs_work: 0, solid: 1, strong: 2 };
const DIMENSION_PRIORITY: Record<"content" | "structure" | "delivery", number> = {
  content: 0,
  structure: 1,
  delivery: 2,
};

// ---------------------------------------------------------------------------
// Persistence: canonical row into evaluation_versions + legacy projection on
// answers so V1 clients keep rendering (build-plan §Wave1 dual-write).
// ---------------------------------------------------------------------------

const LEGACY_SCORE_BY_BAND: Record<Band, number> = { needs_work: 4, solid: 6, strong: 8 };

function legacyFeedback(result: EvaluationResult): string {
  const parts: string[] = [];
  if (result.content.strengths.length > 0) parts.push(result.content.strengths[0]!);
  if (result.content.missingEvidence.length > 0) {
    parts.push(`Missing: ${result.content.missingEvidence.slice(0, 2).join(", ")}.`);
  }
  parts.push(result.nextAction.instruction);
  return parts.join(" ").slice(0, 4000);
}

export async function persistEvaluation(db: DB, answerId: number, result: EvaluationResult): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(answers)
      .set({
        score: LEGACY_SCORE_BY_BAND[result.overallBand],
        feedback: legacyFeedback(result),
        status: "completed",
        errorMessage: null,
      })
      .where(eq(answers.id, answerId));

    await tx.insert(evaluationVersions).values({
      answerId,
      contractVersion: result.contractVersion,
      evaluatorVersion: result.versions.evaluatorVersion,
      promptVersion: result.versions.promptVersion,
      rubricVersion: result.versions.rubricVersion,
      provider: result.versions.provider,
      modelVersion: result.versions.modelVersion,
      overallBand: result.overallBand,
      languageBlocked: false,
      result: result as unknown as Record<string, unknown>,
    });
  });
}
