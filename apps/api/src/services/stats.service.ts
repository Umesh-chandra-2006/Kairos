import { and, eq, gte, isNotNull, lt } from "drizzle-orm";
import { type DB } from "@kairos/db";
import { answers, questions } from "@kairos/db/schema";
import { addDaysStr, lastMondayStr } from "../lib/dates";

export interface WeeklySummaryResult {
  weekStart: string;
  weekEnd: string;
  answered: number;
  avgScore: number | null;
  weakestCategory: string | null;
}

export function computeWeeklyStats(
  rows: Array<{ category: string; score: number | null }>,
): Pick<WeeklySummaryResult, "answered" | "avgScore" | "weakestCategory"> {
  const byCategory = new Map<string, { sum: number; n: number }>();
  let scoreSum = 0;
  let scoreCount = 0;
  for (const row of rows) {
    if (row.score != null) {
      scoreSum += row.score;
      scoreCount += 1;
      const acc = byCategory.get(row.category) ?? { sum: 0, n: 0 };
      acc.sum += row.score;
      acc.n += 1;
      byCategory.set(row.category, acc);
    }
  }
  let weakest: string | null = null;
  let weakestAvg = Infinity;
  for (const [category, acc] of byCategory) {
    const avg = acc.sum / acc.n;
    if (avg < weakestAvg) {
      weakestAvg = avg;
      weakest = category;
    }
  }
  return {
    answered: rows.length,
    avgScore: scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : null,
    weakestCategory: weakest,
  };
}

/**
 * The previous Mon–Sun week's summary for a single user's daily answers.
 * Computable any day of the week (the email worker reuses the same math).
 */
export async function getWeeklySummary(db: DB, userId: number, now = new Date()): Promise<WeeklySummaryResult> {
  const weekEnd = lastMondayStr(now); // this Monday (exclusive)
  const weekStart = addDaysStr(weekEnd, -7); // last Monday (inclusive)

  const rows = await db
    .select({ category: questions.category, score: answers.score })
    .from(answers)
    .innerJoin(questions, eq(answers.questionId, questions.id))
    .where(
      and(
        eq(answers.userId, userId),
        gte(answers.date, weekStart),
        lt(answers.date, weekEnd),
        isNotNull(answers.dailyKey),
      ),
    );

  return { weekStart, weekEnd, ...computeWeeklyStats(rows) };
}
