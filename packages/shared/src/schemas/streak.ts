import { z } from "zod";

export const streakSchema = z.object({
  current: z.number().int().min(0),
  longest: z.number().int().min(0),
  lastActiveDate: z.string().nullable(),
  freezesRemaining: z.number().int().min(0),
  lastFreezeRefill: z.string().nullable(),
});

export type Streak = z.infer<typeof streakSchema>;
