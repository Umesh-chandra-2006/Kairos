import { eq } from "drizzle-orm";
import { getDb, type DB } from "@kairos/db";
import { streaks, type Streak } from "@kairos/db/schema";
import { addDaysStr, lastMondayStr } from "../lib/dates";

export interface StreakResult {
  current: number;
  longest: number;
  lastActiveDate: string | null;
  freezesRemaining: number;
  lastFreezeRefill: string | null;
}

function toResult(s: Streak): StreakResult {
  return {
    current: s.current,
    longest: s.longest,
    lastActiveDate: s.lastActiveDate,
    freezesRemaining: s.freezesRemaining,
    lastFreezeRefill: s.lastFreezeRefill,
  };
}

async function getStreak(db: DB, userId: number): Promise<Streak> {
  const [row] = await db.select().from(streaks).where(eq(streaks.userId, userId));
  if (row) return row;
  const [inserted] = await db
    .insert(streaks)
    .values({ userId, current: 0, longest: 0, freezesRemaining: 1 })
    .$returningId();
  return {
    id: inserted!.id,
    userId,
    current: 0,
    longest: 0,
    lastActiveDate: null,
    freezesRemaining: 1,
    lastFreezeRefill: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export const streakService = {
  get(db: DB, userId: number): Promise<StreakResult> {
    return getStreak(db, userId).then(toResult);
  },

  /**
   * Advance the streak for an activity on `date`. Returns the updated streak.
   * Consecutive days increment; a gap of exactly one missed day consumes a
   * freeze to keep the streak alive (one freeze per week); any longer gap
   * resets the streak to 1.
   */
  async recordActivity(db: DB, userId: number, date: string): Promise<StreakResult> {
    const row = await getStreak(db, userId);
    const yesterday = addDaysStr(date, -1);
    const dayBeforeYesterday = addDaysStr(date, -2);

    let current = 1;
    let freezesRemaining = row.freezesRemaining;
    if (row.lastActiveDate === date) {
      current = row.current; // already counted today
    } else if (row.lastActiveDate === yesterday) {
      current = row.current + 1;
    } else if (row.lastActiveDate === dayBeforeYesterday && freezesRemaining > 0) {
      // Missed exactly one day; a freeze protects the streak
      current = row.current + 1;
      freezesRemaining -= 1;
    }
    const longest = Math.max(row.longest, current);

    await db
      .update(streaks)
      .set({ current, longest, lastActiveDate: date, freezesRemaining })
      .where(eq(streaks.userId, userId));

    return { current, longest, lastActiveDate: date, freezesRemaining, lastFreezeRefill: row.lastFreezeRefill };
  },

  /**
   * Refill the weekly freeze on first read each week (Monday).
   */
  async refillFreezes(db: DB, userId: number): Promise<StreakResult> {
    const row = await getStreak(db, userId);
    const monday = lastMondayStr();
    if (row.lastFreezeRefill !== monday && row.freezesRemaining < 1) {
      await db
        .update(streaks)
        .set({ freezesRemaining: 1, lastFreezeRefill: monday })
        .where(eq(streaks.userId, userId));
      return { ...toResult(row), freezesRemaining: 1, lastFreezeRefill: monday };
    }
    if (row.lastFreezeRefill !== monday) {
      await db
        .update(streaks)
        .set({ lastFreezeRefill: monday })
        .where(eq(streaks.userId, userId));
      return { ...toResult(row), lastFreezeRefill: monday };
    }
    return toResult(row);
  },
};
