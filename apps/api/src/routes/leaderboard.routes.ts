import { Router } from "express";
import { getDb } from "@kairos/db";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { leaderboardService } from "../services/leaderboard.service";

export const leaderboardRouter: Router = Router();

leaderboardRouter.use(requireAuth);

leaderboardRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const db = getDb();
    res.json({ entries: await leaderboardService.get(db, 20) });
  }),
);

leaderboardRouter.get(
  "/me/rank",
  asyncHandler(async (req, res) => {
    const db = getDb();
    res.json({ rank: await leaderboardService.getUserRank(db, req.userId!) });
  }),
);
