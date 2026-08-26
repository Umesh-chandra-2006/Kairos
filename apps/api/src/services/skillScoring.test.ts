import { describe, it, expect, beforeEach } from "vitest";
import { eq, and } from "drizzle-orm";
import { getDb } from "@kairos/db";
import { userSkillState, skillEvidence } from "@kairos/db/schema";
import { updateSkillState, getSkillProfile, getWeakSkills } from "./skillScoring";
import type { EvaluationResult } from "@kairos/shared";

const TEST_USER_ID = 999_001;

function makeEvaluation(overrides: Partial<EvaluationResult> = {}): EvaluationResult {
  return {
    contractVersion: 2,
    answerId: 1,
    kind: "initial",
    followUpOf: null,
    content: {
      band: "solid",
      source: "model",
      evidenceFound: ["defined normalization", "explained 1NF", "gave example"],
      missingEvidence: ["did not cover BCNF"],
      misconceptions: [],
      strengths: ["clear definition", "good example"],
      weaknesses: ["missing advanced forms"],
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
      instruction: "Practice explaining BCNF decomposition with a concrete example to strengthen your coverage of advanced normal forms",
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

beforeEach(async () => {
  const db = getDb();
  await db.delete(userSkillState).where(eq(userSkillState.userId, TEST_USER_ID));
  await db.delete(skillEvidence).where(eq(skillEvidence.userId, TEST_USER_ID));
});

describe("skillScoring", () => {
  describe("updateSkillState", () => {
    it("creates skill state rows for all 10 dimensions on first evaluation", async () => {
      const db = getDb();
      const evaluation = makeEvaluation();
      const updated = await updateSkillState(db, TEST_USER_ID, evaluation, 1);

      expect(updated).toHaveLength(10);
      expect(updated).toContain("technical_explanation");
      expect(updated).toContain("structure");
      expect(updated).toContain("delivery_quality");

      const profile = await getSkillProfile(db, TEST_USER_ID);
      expect(profile).toHaveLength(10);
    });

    it("creates skill evidence rows for each dimension", async () => {
      const db = getDb();
      const evaluation = makeEvaluation();
      await updateSkillState(db, TEST_USER_ID, evaluation, 1);

      const evidence = await db
        .select()
        .from(skillEvidence)
        .where(eq(skillEvidence.userId, TEST_USER_ID));

      expect(evidence).toHaveLength(10);
      expect(evidence[0].score).toBeGreaterThanOrEqual(0);
      expect(evidence[0].score).toBeLessThanOrEqual(10);
    });

    it("applies EMA on second evaluation (score moves toward new value)", async () => {
      const db = getDb();
      const eval1 = makeEvaluation();
      await updateSkillState(db, TEST_USER_ID, eval1, 1);

      const before = await db
        .select()
        .from(userSkillState)
        .where(and(eq(userSkillState.userId, TEST_USER_ID), eq(userSkillState.skillId, "technical_explanation")))
        .limit(1);
      const scoreBefore = before[0].score;

      const eval2 = makeEvaluation({
        content: {
          ...eval1.content,
          band: "strong",
          evidenceFound: ["defined normalization", "explained 1NF", "explained 2NF", "explained 3NF", "explained BCNF"],
          missingEvidence: [],
          misconceptions: [],
          strengths: ["comprehensive coverage", "clear examples", "advanced understanding"],
          weaknesses: [],
        },
      });
      await updateSkillState(db, TEST_USER_ID, eval2, 2);

      const after = await db
        .select()
        .from(userSkillState)
        .where(and(eq(userSkillState.userId, TEST_USER_ID), eq(userSkillState.skillId, "technical_explanation")))
        .limit(1);

      expect(after[0].evidenceCount).toBe(2);
      expect(after[0].score).toBeGreaterThan(scoreBefore);
    });

    it("sets trend to improving when score increases", async () => {
      const db = getDb();
      const eval1 = makeEvaluation({ content: { ...makeEvaluation().content, band: "needs_work" } });
      await updateSkillState(db, TEST_USER_ID, eval1, 1);

      const eval2 = makeEvaluation({ content: { ...makeEvaluation().content, band: "strong" } });
      await updateSkillState(db, TEST_USER_ID, eval2, 2);

      const state = await db
        .select()
        .from(userSkillState)
        .where(and(eq(userSkillState.userId, TEST_USER_ID), eq(userSkillState.skillId, "technical_explanation")))
        .limit(1);

      expect(state[0].trend).toBe("improving");
    });

    it("returns updated skill list", async () => {
      const db = getDb();
      const updated = await updateSkillState(db, TEST_USER_ID, makeEvaluation(), 1);
      expect(updated).toEqual([
        "technical_explanation", "structure", "conciseness", "relevance",
        "clarity", "fluency", "composure", "domain_depth",
        "conclusion_strength", "delivery_quality",
      ]);
    });
  });

  describe("getSkillProfile", () => {
    it("returns empty for user with no skill state", async () => {
      const db = getDb();
      const profile = await getSkillProfile(db, 999_999);
      expect(profile).toHaveLength(0);
    });

    it("returns skills ordered by score ascending (weakest first)", async () => {
      const db = getDb();
      await updateSkillState(db, TEST_USER_ID, makeEvaluation(), 1);

      const profile = await getSkillProfile(db, TEST_USER_ID);
      expect(profile).toHaveLength(10);
      for (let i = 1; i < profile.length; i++) {
        expect(profile[i].score).toBeGreaterThanOrEqual(profile[i - 1].score);
      }
    });

    it("includes skill metadata from skills table", async () => {
      const db = getDb();
      await updateSkillState(db, TEST_USER_ID, makeEvaluation(), 1);

      const profile = await getSkillProfile(db, TEST_USER_ID);
      const techExp = profile.find((p) => p.skillId === "technical_explanation");
      expect(techExp?.skillName).toBe("Technical Explanation");
      expect(techExp?.category).toBe("content");
    });
  });

  describe("getWeakSkills", () => {
    it("returns up to N weakest skills", async () => {
      const db = getDb();
      await updateSkillState(db, TEST_USER_ID, makeEvaluation(), 1);

      const weak = await getWeakSkills(db, TEST_USER_ID, 3);
      expect(weak).toHaveLength(3);
    });

    it("defaults to 3 weakest", async () => {
      const db = getDb();
      await updateSkillState(db, TEST_USER_ID, makeEvaluation(), 1);

      const weak = await getWeakSkills(db, TEST_USER_ID);
      expect(weak).toHaveLength(3);
    });
  });
});
