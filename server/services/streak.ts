import { getDB } from "../lib/db";
import { streaks, Streak } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { format, subDays, isMonday as isDateMonday, startOfWeek, differenceInDays, parseISO } from "date-fns";

function getTodayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function getYesterdayStr(): string {
  return format(subDays(new Date(), 1), "yyyy-MM-dd");
}

export async function updateStreakOnAnswer(userId: number): Promise<Streak> {
  const db = getDB();
  const streak = await db.query.streaks.findFirst({
    where: eq(streaks.userId, userId),
  });

  if (!streak) {
    throw new Error("Streak not found for user");
  }

  const todayStr = getTodayStr();
  const yesterdayStr = getYesterdayStr();
  let current = streak.current;

  if (streak.lastActiveDate === todayStr) {
    return streak;
  }

  if (streak.lastActiveDate === yesterdayStr) {
    current += 1;
  } else if (streak.lastActiveDate) {
    // If last active was not yesterday, check gap
    const lastActiveDate = parseISO(streak.lastActiveDate);
    const todayDate = new Date();
    const gap = differenceInDays(todayDate, lastActiveDate);
    
    if (gap > 1) {
      // More than 1 day gap means streak reset (unless it was exactly 1 day gap which means freeze was likely used)
      // Actually, if we are here, it's NOT yesterday, so gap is at least 2.
      current = 1;
    }
  } else {
    current = 1;
  }

  const newLongest = Math.max(current, streak.longest);

  await db
    .update(streaks)
    .set({
      current,
      longest: newLongest,
      lastActiveDate: todayStr,
      updatedAt: new Date(),
    })
    .where(eq(streaks.userId, userId));

  const updated = await db.query.streaks.findFirst({
    where: eq(streaks.userId, userId),
  });

  if (!updated) throw new Error("Failed to update streak");
  return updated;
}

export async function getStreakWithFreezeRefill(userId: number): Promise<Streak> {
  const db = getDB();
  const streak = await db.query.streaks.findFirst({
    where: eq(streaks.userId, userId),
  });

  if (!streak) {
    throw new Error("Streak not found for user");
  }

  const now = new Date();
  if (isDateMonday(now)) {
    const mondayStr = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    if (!streak.lastFreezeRefill || streak.lastFreezeRefill !== mondayStr) {
      await db
        .update(streaks)
        .set({
          freezesRemaining: 1,
          lastFreezeRefill: mondayStr,
          updatedAt: new Date(),
        })
        .where(eq(streaks.userId, userId));

      const updated = await db.query.streaks.findFirst({
        where: eq(streaks.userId, userId),
      });
      if (!updated) throw new Error("Streak not found after update");
      return updated;
    }
  }

  return streak;
}

export async function useFreeze(userId: number): Promise<Streak> {
  const db = getDB();
  const streak = await db.query.streaks.findFirst({
    where: eq(streaks.userId, userId),
  });

  if (!streak) throw new Error("Streak not found for user");
  if (streak.freezesRemaining < 1) throw new Error("No freezes remaining");

  await db
    .update(streaks)
    .set({
      freezesRemaining: streak.freezesRemaining - 1,
      lastActiveDate: getTodayStr(), // Protecting the streak for today
      updatedAt: new Date(),
    })
    .where(eq(streaks.userId, userId));

  const updated = await db.query.streaks.findFirst({
    where: eq(streaks.userId, userId),
  });

  if (!updated) throw new Error("Failed to use freeze");
  return updated;
}
