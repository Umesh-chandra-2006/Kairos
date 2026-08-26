import type { Band, EvaluationResult } from "@kairos/shared";
import { deriveOverallBand } from "@kairos/shared";

export interface BenchmarkFixture {
  id: string;
  questionText: string;
  category: string;
  difficulty: string;
  transcript: string;
  durationMs: number;
  expectedContentBand: Band;
  expectedStructureBand: Band;
  expectedDeliveryBand: Band;
  expectedOverallBand: Band;
  tags: string[];
}

export interface ReScoreResult {
  fixtureId: string;
  original: {
    contentBand: Band;
    structureBand: Band;
    deliveryBand: Band;
    overallBand: Band;
  };
  rescored: {
    contentBand: Band;
    structureBand: Band;
    deliveryBand: Band;
    overallBand: Band;
  };
  flipped: boolean;
  criticalFlip: boolean;
  reason: string;
}

export interface HarnessReport {
  total: number;
  flipped: number;
  criticalFlips: number;
  flipRate: number;
  criticalFlipRate: number;
  results: ReScoreResult[];
  summary: {
    byDimension: {
      content: { stable: number; flipped: number };
      structure: { stable: number; flipped: number };
      delivery: { stable: number; flipped: number };
    };
  };
}

const BAND_RANK: Record<Band, number> = { needs_work: 0, solid: 1, strong: 2 };

function bandDistance(a: Band, b: Band): number {
  return Math.abs(BAND_RANK[a] - BAND_RANK[b]);
}

function flipReason(dim: string, from: Band, to: Band): string {
  return `${dim}: ${from} → ${to} (distance=${bandDistance(from, to)})`;
}

/**
 * Compare two evaluations and produce a ReScoreResult.
 * A flip is any band change. A critical flip crosses the strong↔needs_work boundary.
 */
export function compareEvaluations(
  fixtureId: string,
  original: EvaluationResult,
  rescored: EvaluationResult,
): ReScoreResult {
  const flipped =
    original.content.band !== rescored.content.band ||
    original.structure.band !== rescored.structure.band ||
    original.delivery.band !== rescored.delivery.band ||
    original.overallBand !== rescored.overallBand;

  const criticalFlip =
    bandDistance(original.overallBand, rescored.overallBand) >= 2;

  const reasons: string[] = [];
  if (original.content.band !== rescored.content.band)
    reasons.push(flipReason("content", original.content.band, rescored.content.band));
  if (original.structure.band !== rescored.structure.band)
    reasons.push(flipReason("structure", original.structure.band, rescored.structure.band));
  if (original.delivery.band !== rescored.delivery.band)
    reasons.push(flipReason("delivery", original.delivery.band, rescored.delivery.band));
  if (original.overallBand !== rescored.overallBand)
    reasons.push(flipReason("overall", original.overallBand, rescored.overallBand));

  return {
    fixtureId,
    original: {
      contentBand: original.content.band,
      structureBand: original.structure.band,
      deliveryBand: original.delivery.band,
      overallBand: original.overallBand,
    },
    rescored: {
      contentBand: rescored.content.band,
      structureBand: rescored.structure.band,
      deliveryBand: rescored.delivery.band,
      overallBand: rescored.overallBand,
    },
    flipped,
    criticalFlip,
    reason: reasons.join("; ") || "no change",
  };
}

/**
 * Build a full harness report from a set of ReScoreResults.
 */
export function buildReport(results: ReScoreResult[]): HarnessReport {
  const flipped = results.filter((r) => r.flipped).length;
  const criticalFlips = results.filter((r) => r.criticalFlip).length;

  const byDimension = {
    content: { stable: 0, flipped: 0 },
    structure: { stable: 0, flipped: 0 },
    delivery: { stable: 0, flipped: 0 },
  };

  for (const r of results) {
    if (r.original.contentBand !== r.rescored.contentBand) byDimension.content.flipped++;
    else byDimension.content.stable++;
    if (r.original.structureBand !== r.rescored.structureBand) byDimension.structure.flipped++;
    else byDimension.structure.stable++;
    if (r.original.deliveryBand !== r.rescored.deliveryBand) byDimension.delivery.flipped++;
    else byDimension.delivery.stable++;
  }

  return {
    total: results.length,
    flipped,
    criticalFlips,
    flipRate: results.length > 0 ? flipped / results.length : 0,
    criticalFlipRate: results.length > 0 ? criticalFlips / results.length : 0,
    results,
    summary: { byDimension },
  };
}

/**
 * Pass criteria for the band-flip gate (build-plan Wave 1 exit):
 * - Overall flip rate ≤ 15%
 * - Zero critical flips (strong↔needs_work)
 * - Delivery (deterministic) must have 0% flip rate (same input = same output)
 */
export function checkPassCriteria(report: HarnessReport): {
  passed: boolean;
  failures: string[];
} {
  const failures: string[] = [];

  if (report.flipRate > 0.15) {
    failures.push(`Overall flip rate ${(report.flipRate * 100).toFixed(1)}% exceeds 15% threshold`);
  }
  if (report.criticalFlips > 0) {
    failures.push(`${report.criticalFlips} critical flip(s) detected (strong↔needs_work boundary)`);
  }
  if (report.summary.byDimension.delivery.flipped > 0) {
    failures.push(`${report.summary.byDimension.delivery.flipped} delivery flip(s) — deterministic dimension must be stable`);
  }

  return { passed: failures.length === 0, failures };
}
