import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Domain event logging (build-plan §0.7). One line per meaningful state
// change, with stable field names so logs stay queryable:
//   evt=... userId answerId durationMs provider outcome
// ---------------------------------------------------------------------------

export const DOMAIN_EVENTS = [
  "eval_started",
  "eval_completed",
  "eval_failed",
  "eval_claim_skipped",
] as const;
export type DomainEvent = (typeof DOMAIN_EVENTS)[number];

export function logDomainEvent(event: DomainEvent, fields: Record<string, unknown> = {}): void {
  logger.info({ evt: event, ...fields }, event);
}

// ---------------------------------------------------------------------------
// Runtime metrics accumulator (build-plan Wave 3 §10)
// Non-blocking, in-memory. Exposed via GET /api/health/metrics.
// ---------------------------------------------------------------------------

interface MetricEntry {
  count: number;
  totalMs: number;
  maxMs: number;
  errors: number;
}

interface MetricsState {
  api: Record<string, MetricEntry>;
  workers: {
    evalStarted: number;
    evalCompleted: number;
    evalFailed: number;
    avgEvalMs: number;
    totalEvalMs: number;
    evalCount: number;
  };
  costs: {
    totalTokensIn: number;
    totalTokensOut: number;
    totalCalls: number;
    totalCostUsd: number;
  };
  startedAt: string;
}

const state: MetricsState = {
  api: {},
  workers: {
    evalStarted: 0,
    evalCompleted: 0,
    evalFailed: 0,
    avgEvalMs: 0,
    totalEvalMs: 0,
    evalCount: 0,
  },
  costs: {
    totalTokensIn: 0,
    totalTokensOut: 0,
    totalCalls: 0,
    totalCostUsd: 0,
  },
  startedAt: new Date().toISOString(),
};

// --- API latency tracking ---

export function recordApiLatency(route: string, method: string, ms: number, isError = false): void {
  const key = `${method} ${route}`;
  const entry = state.api[key] ?? { count: 0, totalMs: 0, maxMs: 0, errors: 0 };
  entry.count++;
  entry.totalMs += ms;
  entry.maxMs = Math.max(entry.maxMs, ms);
  if (isError) entry.errors++;
  state.api[key] = entry;
}

// --- Worker metrics ---

export function recordEvalStarted(): void {
  state.workers.evalStarted++;
}

export function recordEvalCompleted(ms: number): void {
  state.workers.evalCompleted++;
  state.workers.totalEvalMs += ms;
  state.workers.evalCount++;
  state.workers.avgEvalMs = state.workers.totalEvalMs / state.workers.evalCount;
}

export function recordEvalFailed(): void {
  state.workers.evalFailed++;
}

// --- Cost tracking ---

const COST_PER_1K_INPUT = 0.00015;
const COST_PER_1K_OUTPUT = 0.0006;

export function recordLlmCall(tokensIn: number, tokensOut: number): void {
  state.costs.totalTokensIn += tokensIn;
  state.costs.totalTokensOut += tokensOut;
  state.costs.totalCalls++;
  state.costs.totalCostUsd += (tokensIn / 1000) * COST_PER_1K_INPUT + (tokensOut / 1000) * COST_PER_1K_OUTPUT;
}

// --- Read metrics ---

export function getMetrics(): MetricsState {
  return { ...state };
}

export function resetMetrics(): void {
  state.api = {};
  state.workers = { evalStarted: 0, evalCompleted: 0, evalFailed: 0, avgEvalMs: 0, totalEvalMs: 0, evalCount: 0 };
  state.costs = { totalTokensIn: 0, totalTokensOut: 0, totalCalls: 0, totalCostUsd: 0 };
}
