import { describe, it, expect } from "vitest";
import {
  compareEvaluations,
  buildReport,
  checkPassCriteria,
  type ReScoreResult,
} from "./bandFlipHarness";
import type { EvaluationResult } from "@kairos/shared";

function makeResult(overrides: Partial<EvaluationResult> = {}): EvaluationResult {
  return {
    contractVersion: 2,
    answerId: 1,
    kind: "initial",
    followUpOf: null,
    content: {
      band: "solid",
      source: "model",
      evidenceFound: ["test"],
      missingEvidence: [],
      misconceptions: [],
      strengths: [],
      weaknesses: [],
    },
    structure: {
      band: "solid",
      directness: { value: "direct", source: "deterministic" },
      organization: { value: "organized", source: "deterministic" },
      repetition: { value: "low", source: "deterministic" },
      conclusion: { value: "clear", source: "deterministic" },
    },
    delivery: {
      band: "solid",
      source: "deterministic",
      speechRate: 130,
      fillerRate: 8,
      speakingRatio: 0.78,
      pauses: { count: 3, totalMs: 2400, longestMs: 1200, avgMs: 800 },
      durationMs: 45000,
    },
    overallBand: "solid",
    nextAction: {
      instruction: "Practice explaining the concept with more concrete examples",
      focusDimension: "content",
      focusBand: "solid",
    },
    evidenceRefs: [],
    versions: {
      provider: "mock",
      model: "mock",
      modelVersion: "mock-1",
      promptVersion: "v1",
      rubricVersion: "v1",
      evaluatorVersion: "v1",
    },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("bandFlipHarness", () => {
  describe("compareEvaluations", () => {
    it("returns flipped=false for identical evaluations", () => {
      const a = makeResult();
      const b = makeResult();
      const result = compareEvaluations("test-1", a, b);
      expect(result.flipped).toBe(false);
      expect(result.criticalFlip).toBe(false);
      expect(result.reason).toBe("no change");
    });

    it("detects content band flip", () => {
      const a = makeResult();
      const b = makeResult({
        content: { ...a.content, band: "strong" },
      });
      b.overallBand = "strong";
      const result = compareEvaluations("test-2", a, b);
      expect(result.flipped).toBe(true);
      expect(result.rescored.contentBand).toBe("strong");
      expect(result.reason).toContain("content");
    });

    it("detects critical flip (needs_work → strong)", () => {
      const a = makeResult({ overallBand: "needs_work" });
      a.content.band = "needs_work";
      a.structure.band = "needs_work";
      a.delivery.band = "needs_work";

      const b = makeResult({ overallBand: "strong" });
      b.content.band = "strong";
      b.structure.band = "strong";
      b.delivery.band = "strong";

      const result = compareEvaluations("test-3", a, b);
      expect(result.flipped).toBe(true);
      expect(result.criticalFlip).toBe(true);
    });

    it("non-critical flip (solid → strong) is flagged as flipped but not critical", () => {
      const a = makeResult({ overallBand: "solid" });
      const b = makeResult({ overallBand: "strong" });
      const result = compareEvaluations("test-4", a, b);
      expect(result.flipped).toBe(true);
      expect(result.criticalFlip).toBe(false);
    });
  });

  describe("buildReport", () => {
    it("computes aggregate stats correctly", () => {
      const results: ReScoreResult[] = [
        { fixtureId: "1", flipped: false, criticalFlip: false, original: { contentBand: "solid", structureBand: "solid", deliveryBand: "solid", overallBand: "solid" }, rescored: { contentBand: "solid", structureBand: "solid", deliveryBand: "solid", overallBand: "solid" }, reason: "" },
        { fixtureId: "2", flipped: true, criticalFlip: false, original: { contentBand: "solid", structureBand: "solid", deliveryBand: "solid", overallBand: "solid" }, rescored: { contentBand: "strong", structureBand: "solid", deliveryBand: "solid", overallBand: "solid" }, reason: "" },
        { fixtureId: "3", flipped: true, criticalFlip: true, original: { contentBand: "needs_work", structureBand: "needs_work", deliveryBand: "needs_work", overallBand: "needs_work" }, rescored: { contentBand: "strong", structureBand: "strong", deliveryBand: "needs_work", overallBand: "strong" }, reason: "" },
      ];
      const report = buildReport(results);
      expect(report.total).toBe(3);
      expect(report.flipped).toBe(2);
      expect(report.criticalFlips).toBe(1);
      expect(report.flipRate).toBeCloseTo(2 / 3);
      expect(report.summary.byDimension.content.flipped).toBe(2);
      expect(report.summary.byDimension.structure.flipped).toBe(1);
      expect(report.summary.byDimension.delivery.flipped).toBe(0);
    });

    it("returns zero counts for empty results", () => {
      const report = buildReport([]);
      expect(report.total).toBe(0);
      expect(report.flipRate).toBe(0);
    });
  });

  describe("checkPassCriteria", () => {
    it("passes when flip rate ≤ 15% and no critical flips", () => {
      const results: ReScoreResult[] = Array.from({ length: 20 }, (_, i) => ({
        fixtureId: String(i),
        flipped: i < 2,
        criticalFlip: false,
        original: { contentBand: "solid" as const, structureBand: "solid" as const, deliveryBand: "solid" as const, overallBand: "solid" as const },
        rescored: { contentBand: "solid" as const, structureBand: "solid" as const, deliveryBand: "solid" as const, overallBand: "solid" as const },
        reason: "",
      }));
      const report = buildReport(results);
      const { passed, failures } = checkPassCriteria(report);
      expect(passed).toBe(true);
      expect(failures).toHaveLength(0);
    });

    it("fails when flip rate > 15%", () => {
      const results: ReScoreResult[] = Array.from({ length: 10 }, (_, i) => ({
        fixtureId: String(i),
        flipped: i < 3,
        criticalFlip: false,
        original: { contentBand: "solid" as const, structureBand: "solid" as const, deliveryBand: "solid" as const, overallBand: "solid" as const },
        rescored: { contentBand: "solid" as const, structureBand: "solid" as const, deliveryBand: "solid" as const, overallBand: "solid" as const },
        reason: "",
      }));
      const report = buildReport(results);
      const { passed } = checkPassCriteria(report);
      expect(passed).toBe(false);
    });

    it("fails on critical flips", () => {
      const results: ReScoreResult[] = [
        {
          fixtureId: "1",
          flipped: true,
          criticalFlip: true,
          original: { contentBand: "needs_work", structureBand: "needs_work", deliveryBand: "needs_work", overallBand: "needs_work" },
          rescored: { contentBand: "strong", structureBand: "strong", deliveryBand: "strong", overallBand: "strong" },
          reason: "",
        },
      ];
      const report = buildReport(results);
      const { passed, failures } = checkPassCriteria(report);
      expect(passed).toBe(false);
      expect(failures.some((f) => f.includes("critical flip"))).toBe(true);
    });

    it("fails on delivery dimension flips", () => {
      const results: ReScoreResult[] = [
        {
          fixtureId: "1",
          flipped: true,
          criticalFlip: false,
          original: { contentBand: "solid", structureBand: "solid", deliveryBand: "solid", overallBand: "solid" },
          rescored: { contentBand: "solid", structureBand: "solid", deliveryBand: "strong", overallBand: "solid" },
          reason: "",
        },
      ];
      const report = buildReport(results);
      const { passed, failures } = checkPassCriteria(report);
      expect(passed).toBe(false);
      expect(failures.some((f) => f.includes("delivery"))).toBe(true);
    });
  });
});
