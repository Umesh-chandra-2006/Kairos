import { desc, eq, gte, and, isNotNull, count, avg } from "drizzle-orm";
import { type DB } from "@kairos/db";
import { answers, streaks, users } from "@kairos/db/schema";
import type { LeaderboardEntry } from "@kairos/shared";
import { lastMondayStr } from "../lib/dates";

interface LeaderRow {
  userId: number;
  name: string | null;
  answerCount: number;
  avg: number;
  currentStreak: number;
  longestStreak: number;
}

async function weeklyRows(db: DB): Promise<LeaderRow[]> {
  const weekStart = lastMondayStr();
  const rows = await db
    .select({
      userId: answers.userId,
      name: users.name,
      answerCount: count(answers.id),
      avg: avg(answers.score),
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
    })
    .from(answers)
    .innerJoin(streaks, eq(answers.userId, streaks.userId))
    .innerJoin(users, eq(answers.userId, users.id))
    .where(and(gte(answers.date, weekStart), isNotNull(answers.score)))
    .groupBy(answers.userId, users.name, streaks.current, streaks.longest)
    .orderBy(desc(count(answers.id)), desc(avg(answers.score)));

  return rows.map((r) => ({
    userId: r.userId,
    name: r.name,
    answerCount: r.answerCount,
    avg: r.avg === null ? 0 : Number(r.avg),
    currentStreak: r.currentStreak,
    longestStreak: r.longestStreak,
  }));
}

export const leaderboardService = {
  async get(db: DB, limit = 20): Promise<LeaderboardEntry[]> {
    const rows = await weeklyRows(db);
    return rows.slice(0, limit).map((r, i) => ({
      userId: r.userId,
      name: r.name,
      rank: i + 1,
      currentStreak: r.currentStreak,
      longestStreak: r.longestStreak,
      avgScore: r.avg,
      answers: r.answerCount,
    }));
  },

  async getUserRank(db: DB, userId: number): Promise<number | null> {
    const rows = await weeklyRows(db);
    const idx = rows.findIndex((r) => r.userId === userId);
    return idx === -1 ? null : idx + 1;
  },
};
