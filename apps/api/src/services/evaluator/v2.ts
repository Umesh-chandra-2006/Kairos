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
import { getEnv } from "@kairos/config";
import { bandDelivery, computeDeliveryMetrics } from "../delivery";
import { checkLanguage } from "../language";
import { MockAIProvider, OpenRouterProvider, type FullAIProvider } from "../providers";
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
  reasoning: z.string().min(1).max(1500),
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

Think step by step:
1. First, identify each rubric point from the hints.
2. For each point, check whether the transcript clearly demonstrates it (cite the relevant transcript quote or paraphrase).
3. Note any factual errors or misconceptions.
4. Assess the overall organization and structure.
5. Derive the content band based on rubric coverage.

Then return STRICT JSON only (no markdown fences) with exactly these keys:
{
  "reasoning": "your step-by-step analysis of rubric coverage, citing transcript evidence for each point",
  "contentBand": "needs_work" | "solid" | "strong",
  "evidenceFound": ["rubric points demonstrated, with brief transcript citation"],
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
- The transcript is spoken language: ignore filler words when judging content.
- In evidenceFound/missingEvidence, reference specific parts of the transcript where possible.`;

export interface EvaluateV2Params {
  answerId: number;
  questionText: string;
  rubricHints: string;
  level: string;
  transcript: string;
  words: ASRWord[];
  durationMs: number;
  /** False when ASR words were interpolated from segments (synthetic). */
  hasRealTimestamps: boolean;
}

export class EvalModelOutputError extends Error {
  readonly retryable = true;
  constructor() {
    super("Evaluator model returned unusable output");
    this.name = "EvalModelOutputError";
  }
}

/**
 * Model resolution for the V2 pipeline (distinct from the V1 text path):
 * explicit mock > OpenRouter when a key exists > deterministic mock in test
 * environments > otherwise unavailable. Keeps CI keyless and deterministic
 * while production always uses the real model.
 */
export function getModelForV2(override?: string): FullAIProvider {
  const env = getEnv();
  const choice = override ?? env.AI_PROVIDER;
  if (choice === "mock") return new MockAIProvider();
  if (env.OPENROUTER_API_KEY) return new OpenRouterProvider(env.OPENROUTER_API_KEY);
  if (choice === "openrouter") throw new Error("OPENROUTER_API_KEY is required for AI_PROVIDER=openrouter");
  if (env.NODE_ENV === "test") return new MockAIProvider();
  throw new Error("No evaluation model is configured");
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

  // P0-2: When ASR timestamps are synthetic (interpolated from segments),
  // delivery metrics are unreliable — mark delivery as unavailable instead
  // of fabricating precise-looking numbers from fake data.
  const hasRealTimestamps = params.hasRealTimestamps;
  const metrics = hasRealTimestamps
    ? computeDeliveryMetrics(params.words, params.durationMs)
    : null;
  const deliveryBand = hasRealTimestamps ? bandDelivery(metrics!) : "needs_work";
  const delivery = hasRealTimestamps
    ? {
        band: deliveryBand,
        source: "deterministic" as const,
        speechRate: metrics!.speechRate,
        fillerRate: metrics!.fillerRate,
        speakingRatio: metrics!.speakingRatio,
        pauses: metrics!.pauses,
        durationMs: params.durationMs,
      }
    : {
        band: "needs_work" as const,
        source: "deterministic" as const,
        availability: "unavailable" as const,
        speechRate: 0,
        fillerRate: 0,
        speakingRatio: 0,
        pauses: { count: 0, totalMs: 0, avgMs: 0, longestMs: 0 },
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

  // P0-3: Build evidenceRefs linking rubric tokens + transcript segments
  // to the conclusions the model reached about each.
  const evidenceRefs: EvaluationResult["evidenceRefs"] = [];

  // Map each found rubric token to an evidenceRef so provenance is traceable.
  mp.evidenceFound.forEach((item, i) => {
    // Extract the rubric token this finding maps to (first 8 words, slugified).
    const tokenSlug = item.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80);
    evidenceRefs.push({
      id: `rubric-${tokenSlug}-${i}`,
      dimension: "content",
      kind: "rubric_token",
      ref: tokenSlug,
      note: item,
    });
  });

  // Map each missing rubric point.
  mp.missingEvidence.forEach((item, i) => {
    const tokenSlug = item.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80);
    evidenceRefs.push({
      id: `missing-${tokenSlug}-${i}`,
      dimension: "content",
      kind: "rubric_token",
      ref: tokenSlug,
      note: `Missing: ${item}`,
    });
  });

  // Map delivery metric evidence when timestamps are real.
  if (hasRealTimestamps && metrics) {
    evidenceRefs.push(
      { id: "metric-speech-rate", dimension: "delivery", kind: "metric", ref: `speech_rate=${metrics.speechRate}` },
      { id: "metric-filler-rate", dimension: "delivery", kind: "metric", ref: `filler_rate=${metrics.fillerRate}` },
      { id: "metric-speaking-ratio", dimension: "delivery", kind: "metric", ref: `speaking_ratio=${metrics.speakingRatio}` },
    );
  }

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
    evidenceRefs,
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

export const LEGACY_SCORE_BY_BAND: Record<Band, number> = { needs_work: 4, solid: 6, strong: 8 };

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
