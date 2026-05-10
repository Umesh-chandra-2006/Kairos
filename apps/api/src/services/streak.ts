import { Streak, IStreak } from "../models/Streak";
import { Types } from "mongoose";

export async function updateStreakOnAnswer(userId: string): Promise<IStreak> {
  const streak = await Streak.findOne({ userId: new Types.ObjectId(userId) });
  if (!streak) throw new Error("Streak document not found for user");

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  if (streak.lastActiveDate === today) {
    // Already answered today — no change
    return streak;
  }

  if (streak.lastActiveDate === yesterday) {
    // Consecutive day — extend streak
    streak.current += 1;
  } else {
    // Streak broken — reset
    streak.current = 1;
  }

  streak.longest = Math.max(streak.current, streak.longest);
  streak.lastActiveDate = today;
  await streak.save();
  return streak;
}
