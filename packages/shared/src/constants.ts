export const CATEGORIES = [
  "DSA",
  "OS",
  "DBMS",
  "Networks",
  "OOP",
  "SystemDesign",
  "Behavioral",
  "FullStack",
  "Frontend",
  "Backend",
  "HR",
  "Cloud",
  "Security",
  "Testing",
  "DevOps",
  "Mobile",
  "MachineLearning",
  "Agile",
  "Product",
] as const;

/** Core categories that feed the daily challenge (technical + behavioral depth). */
export const CORE_CATEGORIES = [
  "DSA",
  "OS",
  "DBMS",
  "Networks",
  "OOP",
  "SystemDesign",
  "Behavioral",
] as const;

/** Additional categories available through practice mode. */
export const PRACTICE_CATEGORIES = [
  "FullStack",
  "Frontend",
  "Backend",
  "HR",
  "Cloud",
  "Security",
  "Testing",
  "DevOps",
  "Mobile",
  "MachineLearning",
  "Agile",
  "Product",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const USER_ROLES = ["student", "professional"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SKILL_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const ANSWER_STATUSES = ["pending", "evaluating", "completed", "failed"] as const;
export type AnswerStatus = (typeof ANSWER_STATUSES)[number];

// ---------------------------------------------------------------------------
// V2 evaluation contract primitives
// ---------------------------------------------------------------------------

/** Version of the canonical evaluation result schema (see schemas/evaluation.ts). */
export const EVALUATION_CONTRACT_VERSION = 1;

/** The three-band grade. Bands are stable where 1–10 points are not. */
export const BANDS = ["needs_work", "solid", "strong"] as const;
export type Band = (typeof BANDS)[number];

/** UI labels for bands — the only strings a student should ever see. */
export const BAND_LABELS: Record<Band, string> = {
  needs_work: "Needs Work",
  solid: "Solid",
  strong: "Strong",
};

/** Provenance of an evaluated value: LLM-generated vs deterministic measurement. */
export const EVALUATION_SOURCES = ["model", "deterministic"] as const;
export type EvaluationSource = (typeof EVALUATION_SOURCES)[number];

/**
 * Explicit submission state machine for V2.
 * Extends the V1 answer statuses (`pending`/`evaluating` map to
 * `created`/`processing`) so every transition is intentional and auditable:
 *
 *   created → queued → processing → completed
 *                              ├→ failed → queued (retry) | cancelled
 *   created|queued → cancelled
 */
export const SUBMISSION_STATUSES = [
  "created",
  "queued",
  "processing",
  "completed",
  "failed",
  "cancelled",
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

/** Legal transitions; anything absent is illegal and must be rejected atomically. */
export const SUBMISSION_TRANSITIONS: Record<SubmissionStatus, readonly SubmissionStatus[]> = {
  created: ["queued", "cancelled"],
  queued: ["processing", "cancelled"],
  processing: ["completed", "failed", "queued"],
  completed: [],
  failed: ["queued", "cancelled"],
  cancelled: [],
};

/** Terminal states — no further transitions, safe to skip duplicate work. */
export const TERMINAL_SUBMISSION_STATUSES: readonly SubmissionStatus[] = ["completed", "cancelled"];

/** States from which an atomic worker claim is allowed. */
export const CLAIMABLE_SUBMISSION_STATUSES: readonly SubmissionStatus[] = ["queued"];

export function canTransitionSubmission(from: SubmissionStatus, to: SubmissionStatus): boolean {
  return SUBMISSION_TRANSITIONS[from].includes(to);
}

/** Legacy V1 status → V2 submission status mapping (dual-read path). */
export const LEGACY_ANSWER_STATUS_MAP: Record<AnswerStatus, SubmissionStatus> = {
  pending: "created",
  evaluating: "processing",
  completed: "completed",
  failed: "failed",
};

/**
 * V2 submission status → legacy answer status. Response projection so V1
 * clients keep seeing only ANSWER_STATUSES values (build-plan §0.3).
 */
export const SUBMISSION_TO_LEGACY_ANSWER_STATUS: Record<SubmissionStatus | AnswerStatus, AnswerStatus> = {
  created: "pending",
  queued: "evaluating",
  processing: "evaluating",
  completed: "completed",
  failed: "failed",
  cancelled: "failed",
  pending: "pending",
  evaluating: "evaluating",
};

export const ERROR_CODES = {
  VALIDATION: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL_ERROR",
  AI_UNAVAILABLE: "AI_UNAVAILABLE",
} as const;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * V2 feature flags (build-plan §0.5). All default to false; enablement is
 * data-driven per environment and optionally per college.
 */
export const FEATURE_FLAGS = [
  "voice_v2",
  "new_evaluator",
  "delivery_metrics",
  "adaptive_followup",
  "skill_engine",
  "adaptive_question_selection",
  "tpo_dashboard",
  "whatsapp",
] as const;
export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

export const ANSWER_MIN_LENGTH = 20;
export const ANSWER_MAX_LENGTH = 10_000;

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ERROR_CODES.VALIDATION]: "Invalid request data",
  [ERROR_CODES.UNAUTHORIZED]: "Authentication required",
  [ERROR_CODES.FORBIDDEN]: "You do not have permission to do that",
  [ERROR_CODES.NOT_FOUND]: "Resource not found",
  [ERROR_CODES.CONFLICT]: "Request conflicts with current state",
  [ERROR_CODES.RATE_LIMITED]: "Too many requests, slow down",
  [ERROR_CODES.INTERNAL]: "Something went wrong",
  [ERROR_CODES.AI_UNAVAILABLE]: "AI evaluation is temporarily unavailable",
};
