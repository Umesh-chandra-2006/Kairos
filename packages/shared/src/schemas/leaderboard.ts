import { z } from "zod";

export const leaderboardEntrySchema = z.object({
  userId: z.number().int(),
  name: z.string().nullable(),
  rank: z.number().int(),
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  avgScore: z.number().nullable(),
  answers: z.number().int().min(0),
});

export const leaderboardResponseSchema = z.object({
  entries: z.array(leaderboardEntrySchema),
});

export const userRankSchema = z.object({
  rank: z.number().int().nullable(),
});

export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;
export type LeaderboardResponse = z.infer<typeof leaderboardResponseSchema>;
export type UserRank = z.infer<typeof userRankSchema>;
