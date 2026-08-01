import { Router } from "express";
import { getDb } from "@kairos/db";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { streakService } from "../services/streak.service";

export const streaksRouter: Router = Router();

streaksRouter.use(requireAuth);

streaksRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const db = getDb();
    const streak = await streakService.get(db, req.userId!);
    res.json({ streak: { ...streak, rank: null } });
  }),
);

streaksRouter.post(
  "/refill",
  asyncHandler(async (req, res) => {
    const db = getDb();
    const streak = await streakService.refillFreezes(db, req.userId!);
    res.json({ streak });
  }),
);
