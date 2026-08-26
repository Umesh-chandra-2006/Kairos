import { eq, and, sql } from "drizzle-orm";
import { userSkillState, skillEvidence } from "@kairos/db/schema";
import type { DB } from "@kairos/db/client";
import { skills } from "@kairos/db/schema";
import type { EvaluationResult, Band } from "@kairos/shared";
import { SKILL_DIMENSIONS, type SkillDimension } from "@kairos/shared";

const BAND_SCORE: Record<Band, number> = {
  needs_work: 3,
  solid: 6,
  strong: 9,
};

/**
 * Map evaluation dimensions to skill scores.
 * Each skill gets a 0-10 score derived from the relevant evaluation data.
 */
function extractSkillScores(evaluation: EvaluationResult): {
  skillId: SkillDimension;
  score: number;
  evidence: string[];
}[] {
  const { content, structure, delivery } = evaluation;

  return [
    {
      skillId: "technical_explanation",
      score: BAND_SCORE[content.band],
      evidence: [
        ...content.evidenceFound.slice(0, 3),
        ...content.strengths.slice(0, 2),
      ],
    },
    {
      skillId: "structure",
      score: BAND_SCORE[structure.band],
      evidence: [
        `organization: ${structure.organization.value}`,
        `conclusion: ${structure.conclusion.value}`,
      ],
    },
    {
      skillId: "conciseness",
      score:
        structure.directness.value === "direct"
          ? 8
          : structure.directness.value === "mixed"
            ? 5
            : 3,
      evidence: [`directness: ${structure.directness.value}`],
    },
    {
      skillId: "relevance",
      score:
        content.evidenceFound.length >= 3
          ? 8
          : content.evidenceFound.length >= 1
            ? 6
            : 3,
      evidence: content.evidenceFound.slice(0, 3),
    },
    {
      skillId: "clarity",
      score:
        delivery.speechRate >= 100 && delivery.speechRate <= 180
          ? 8
          : delivery.speechRate >= 80
            ? 6
            : 4,
      evidence: [`speechRate: ${delivery.speechRate} wpm`],
    },
    {
      skillId: "fluency",
      score:
        delivery.fillerRate <= 5
          ? 9
          : delivery.fillerRate <= 15
            ? 7
            : delivery.fillerRate <= 30
              ? 5
              : 3,
      evidence: [`fillerRate: ${delivery.fillerRate.toFixed(1)}/min`],
    },
    {
      skillId: "composure",
      score:
        delivery.pauses.longestMs <= 3000
          ? 8
          : delivery.pauses.longestMs <= 5000
            ? 6
            : 4,
      evidence: [
        `longestPause: ${(delivery.pauses.longestMs / 1000).toFixed(1)}s`,
        `pauseCount: ${delivery.pauses.count}`,
      ],
    },
    {
      skillId: "domain_depth",
      score:
        content.misconceptions.length === 0 && content.evidenceFound.length >= 3
          ? 9
          : content.misconceptions.length <= 1
            ? 7
            : 4,
      evidence: [
        ...content.evidenceFound.slice(0, 2),
        ...content.misconceptions.slice(0, 2).map((m) => `misconception: ${m}`),
      ],
    },
    {
      skillId: "conclusion_strength",
      score:
        structure.conclusion.value === "clear"
          ? 9
          : structure.conclusion.value === "weak"
            ? 5
            : 2,
      evidence: [`conclusion: ${structure.conclusion.value}`],
    },
    {
      skillId: "delivery_quality",
      score: BAND_SCORE[delivery.band],
      evidence: [
        `speechRate: ${delivery.speechRate} wpm`,
        `speakingRatio: ${(delivery.speakingRatio * 100).toFixed(0)}%`,
      ],
    },
  ];
}

/**
 * Exponential moving average for score updates.
 * alpha controls how much new evidence influences the score (0..1).
 * Higher alpha = more responsive, lower = more stable.
 */
function ema(currentScore: number, newScore: number, evidenceCount: number): number {
  const alpha = Math.min(0.5, 2 / (evidenceCount + 1));
  return currentScore * (1 - alpha) + newScore * alpha;
}

/**
 * Compute trend from score history direction.
 */
function computeTrend(
  prevScore: number,
  newScore: number,
): "improving" | "stable" | "declining" {
  const delta = newScore - prevScore;
  if (delta > 0.5) return "improving";
  if (delta < -0.5) return "declining";
  return "stable";
}

/**
 * Update user skill state from an evaluation result.
 * Called by the eval worker after every completed evaluation.
 * Returns the list of skills that were updated.
 */
export async function updateSkillState(
  db: DB,
  userId: number,
  evaluation: EvaluationResult,
  answerId: number,
  evaluationVersionId?: number,
): Promise<SkillDimension[]> {
  const skillScores = extractSkillScores(evaluation);
  const updated: SkillDimension[] = [];

  for (const { skillId, score, evidence } of skillScores) {
    // Upsert skill state
    const [existing] = await db
      .select()
      .from(userSkillState)
      .where(
        and(eq(userSkillState.userId, userId), eq(userSkillState.skillId, skillId)),
      )
      .limit(1);

    if (existing) {
      const newScore = ema(existing.score, score, existing.evidenceCount + 1);
      const trend = computeTrend(existing.score, newScore);
      const newConfidence = Math.min(1, (existing.evidenceCount + 1) / 10);

      await db
        .update(userSkillState)
        .set({
          score: newScore,
          confidence: newConfidence,
          evidenceCount: existing.evidenceCount + 1,
          lastAssessedAt: new Date(),
          trend,
        })
        .where(eq(userSkillState.id, existing.id));
    } else {
      const band = score >= 7 ? "strong" : score >= 4 ? "solid" : "needs_work";
      await db.insert(userSkillState).values({
        userId,
        skillId,
        score,
        confidence: 0.1,
        evidenceCount: 1,
        lastAssessedAt: new Date(),
        trend: "stable",
      });
    }

    // Insert evidence row
    await db.insert(skillEvidence).values({
      userId,
      skillId,
      answerId,
      evaluationVersionId: evaluationVersionId ?? null,
      score,
      band: score >= 7 ? "strong" : score >= 4 ? "solid" : "needs_work",
      evidence,
    });

    updated.push(skillId);
  }

  return updated;
}

/**
 * Get the full skill profile for a user.
 * Returns skills ordered by score ascending (weakest first).
 */
export async function getSkillProfile(db: DB, userId: number) {
  return db
    .select({
      skillId: userSkillState.skillId,
      skillName: skills.name,
      skillDescription: skills.description,
      category: skills.category,
      score: userSkillState.score,
      confidence: userSkillState.confidence,
      evidenceCount: userSkillState.evidenceCount,
      trend: userSkillState.trend,
      lastAssessedAt: userSkillState.lastAssessedAt,
    })
    .from(userSkillState)
    .innerJoin(skills, eq(userSkillState.skillId, skills.id))
    .where(eq(userSkillState.userId, userId))
    .orderBy(userSkillState.score);
}

/**
 * Get the weakest N skills for a user (for adaptive question selection).
 */
export async function getWeakSkills(db: DB, userId: number, limit = 3) {
  const profile = await getSkillProfile(db, userId);
  return profile.slice(0, limit);
}
