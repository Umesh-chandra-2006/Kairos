import { and, desc, eq, isNotNull } from "drizzle-orm";
import { type DB } from "@kairos/db";
import { answers, questions } from "@kairos/db/schema";
import { seedFromInts } from "../lib/ids";

// ---------------------------------------------------------------------------
// Skill profile — computed from completed answers. Used by the adaptive
// question picker to select questions slightly above the user's current level.
// ---------------------------------------------------------------------------

interface CategorySkill {
  avg: number;
  recentAvg: number;
  count: number;
  trend: "improving" | "declining" | "stable";
}

export interface SkillProfile {
  overallAvg: number;
  categories: Record<string, CategorySkill>;
  weakestCategory: string | null;
  totalAnswers: number;
}

const EMPTY_PROFILE: SkillProfile = {
  overallAvg: 0,
  categories: {},
  weakestCategory: null,
  totalAnswers: 0,
};

/**
 * Build a per-category skill profile from a user's completed answers.
 * `recent` is the last N answers per category used for trend detection.
 */
export async function computeSkillProfile(db: DB, userId: number, recent = 5): Promise<SkillProfile> {
  const rows = await db
    .select({
      category: questions.category,
      score: answers.score,
    })
    .from(answers)
    .innerJoin(questions, eq(answers.questionId, questions.id))
    .where(
      and(
        eq(answers.userId, userId),
        eq(answers.status, "completed"),
        isNotNull(answers.score),
      ),
    )
    .orderBy(desc(answers.createdAt));

  if (rows.length === 0) return EMPTY_PROFILE;

  const byCategory = new Map<string, { scores: number[]; recentScores: number[] }>();
  const allScores: number[] = [];

  for (const row of rows) {
    if (row.score === null || row.score === undefined) continue;
    allScores.push(row.score);
    const entry = byCategory.get(row.category) ?? { scores: [], recentScores: [] };
    entry.scores.push(row.score);
    entry.recentScores.push(row.score);
    byCategory.set(row.category, entry);
  }

  const categories: Record<string, CategorySkill> = {};
  for (const [cat, data] of byCategory) {
    const all = data.scores;
    const recentSlice = all.slice(0, recent);
    const olderSlice = all.slice(recent, recent + recent);
    const avg = mean(all);
    const recentAvg = mean(recentSlice);
    const olderAvg = olderSlice.length > 0 ? mean(olderSlice) : avg;
    const diff = recentAvg - olderAvg;
    const trend = diff > 0.5 ? "improving" : diff < -0.5 ? "declining" : "stable";
    categories[cat] = { avg, recentAvg, count: all.length, trend };
  }

  const weakestCategory = Object.entries(categories)
    .sort((a, b) => a[1].avg - b[1].avg)[0]?.[0] ?? null;

  return {
    overallAvg: mean(allScores),
    categories,
    weakestCategory,
    totalAnswers: rows.length,
  };
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

// ---------------------------------------------------------------------------
// Adaptive question picker — selects from a cached pool given a skill profile.
// ---------------------------------------------------------------------------

function difficultyForScore(avg: number): "easy" | "medium" | "hard" {
  if (avg >= 8) return "hard";
  if (avg >= 5) return "medium";
  return "easy";
}

/**
 * Pick a question from `pool` appropriate to the user's skill level.
 *
 * - If a target category is specified and the user has history there, pick
 *   the difficulty level matching their recent average.
 * - If the category is known but the user hasn't answered it before, default
 *   to medium.
 * - If no category is given, pick from the user's weakest category at
 *   medium difficulty (stretch zone).
 * - Falls back to any available question if the preferred bucket is empty.
 *
 * `seed` is used for deterministic tie-breaking in daily mode; pass the date
 * string hash for daily, or leave undefined for pure random in practice.
 */
export function pickAdaptiveQuestion<T extends { id: number; category: string; difficulty: string }>(
  pool: T[],
  profile: SkillProfile,
  targetCategory?: string,
  seed?: number,
): T {
  const filtered = targetCategory ? pool.filter((q) => q.category === targetCategory) : pool;
  if (filtered.length === 0) return fallback(pool, seed);

  const category = targetCategory ?? profile.weakestCategory;
  const catSkill = category ? profile.categories[category] : undefined;

  let targetDifficulty: "easy" | "medium" | "hard";

  if (catSkill && catSkill.count >= 2) {
    targetDifficulty = difficultyForScore(catSkill.recentAvg);
  } else if (filtered.some((q) => q.difficulty === "medium")) {
    targetDifficulty = "medium";
  } else {
    targetDifficulty = "easy";
  }

  const preferred = filtered.filter((q) => q.difficulty === targetDifficulty);
  if (preferred.length > 0) return pickRandom(preferred, seed);

  return fallback(filtered, seed);
}

function fallback<T extends { id: number; category: string; difficulty: string }>(pool: T[], seed?: number): T {
  if (pool.length === 0) throw new Error("No questions available");
  return pickRandom(pool, seed);
}

function pickRandom<T extends { id: number; category: string; difficulty: string }>(pool: T[], seed?: number): T {
  if (pool.length === 1) return pool[0]!;
  const idx = seed !== undefined ? seedFromInts(seed, 99) % pool.length : Math.floor(Math.random() * pool.length);
  return pool[idx]!;
}
