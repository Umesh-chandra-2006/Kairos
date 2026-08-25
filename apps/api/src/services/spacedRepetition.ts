import { and, asc, eq, lte } from "drizzle-orm";
import { type DB } from "@kairos/db";
import { userQuestions, questions } from "@kairos/db/schema";
import { dateStr } from "../lib/dates";
import { isEnabled } from "./flags.service";

// ---------------------------------------------------------------------------
// SM-2 spaced repetition — simplified variant.
//
// The classic SM-2 algorithm uses a 0-5 quality rating. We map the 1-10
// score scale onto it: 1-3 → 1, 4-5 → 2, 6-7 → 3, 8-9 → 4, 10 → 5.
//
// Interval formula:
//   i(1) = 1 day
//   i(2) = 6 days
//   i(n) = i(n-1) * easeFactor   (n >= 3)
//
// Ease factor update: EF' = EF + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)
// Clamped to min 1.3.
//
// On failure (q < 3): reset interval to 1 day, EF unchanged.
// ---------------------------------------------------------------------------

function scoreToQuality(score: number): number {
  if (score <= 3) return 1;
  if (score <= 5) return 2;
  if (score <= 7) return 3;
  if (score <= 9) return 4;
  return 5;
}

function computeNextInterval(intervalDays: number, easeFactor: number, quality: number): { intervalDays: number; easeFactor: number } {
  if (quality < 3) {
    return { intervalDays: 1, easeFactor: Math.max(1.3, easeFactor) };
  }

  let newInterval: number;
  if (intervalDays <= 1) {
    newInterval = 6;
  } else if (intervalDays <= 6) {
    newInterval = Math.round(intervalDays * easeFactor);
  } else {
    newInterval = Math.round(intervalDays * easeFactor);
  }

  const newEF = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  return { intervalDays: newInterval, easeFactor: newEF };
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Record a review and compute the next review date using SM-2.
 * Called after each evaluation completes.
 */
export async function recordReview(db: DB, userId: number, questionId: number, score: number): Promise<void> {
  const today = dateStr();
  const quality = scoreToQuality(score);

  const [existing] = await db
    .select()
    .from(userQuestions)
    .where(and(eq(userQuestions.userId, userId), eq(userQuestions.questionId, questionId)));

  if (existing) {
    const { intervalDays, easeFactor } = computeNextInterval(
      existing.intervalDays,
      existing.easeFactor,
      quality,
    );
    await db
      .update(userQuestions)
      .set({
        nextReviewAt: addDays(today, intervalDays),
        intervalDays,
        easeFactor,
        lastReviewedAt: today,
        reviewCount: existing.reviewCount + 1,
      })
      .where(eq(userQuestions.id, existing.id));
  } else {
    const { intervalDays, easeFactor } = computeNextInterval(1, 2.5, quality);
    await db.insert(userQuestions).values({
      userId,
      questionId,
      nextReviewAt: addDays(today, intervalDays),
      intervalDays,
      easeFactor,
      lastReviewedAt: today,
      reviewCount: 1,
    });
  }
}

/**
 * Get questions due for review today (or earlier), ordered by urgency.
 * Returns question objects with review metadata attached.
 */
export async function getDueReviews(
  db: DB,
  userId: number,
  limit = 5,
): Promise<{ questionId: number; nextReviewAt: string; intervalDays: number; reviewCount: number }[]> {
  const today = dateStr();
  return db
    .select({
      questionId: userQuestions.questionId,
      nextReviewAt: userQuestions.nextReviewAt,
      intervalDays: userQuestions.intervalDays,
      reviewCount: userQuestions.reviewCount,
    })
    .from(userQuestions)
    .where(and(eq(userQuestions.userId, userId), lte(userQuestions.nextReviewAt, today)))
    .orderBy(asc(userQuestions.nextReviewAt))
    .limit(limit);
}

/**
 * Mix due reviews into a practice question pool. If reviews are due and the
 * feature is enabled, the first slot(s) are reserved for review questions;
 * the rest are new questions from the pool.
 */
export async function mixReviewsIntoPool(
  db: DB,
  userId: number,
  pool: { id: number }[],
  maxReviews = 2,
): Promise<{ questionId: number; isReview: boolean }[]> {
  const flagOn = await isEnabled("skill_engine", { userId, db });
  if (!flagOn || pool.length === 0) return pool.map((q) => ({ questionId: q.id, isReview: false }));

  const due = await getDueReviews(db, userId, maxReviews);
  const reviewIds = new Set(due.map((r) => r.questionId));

  const reviews = due.map((r) => ({ questionId: r.questionId, isReview: true as const }));
  const fresh = pool
    .filter((q) => !reviewIds.has(q.id))
    .map((q) => ({ questionId: q.id, isReview: false as const }));

  return [...reviews, ...fresh];
}
