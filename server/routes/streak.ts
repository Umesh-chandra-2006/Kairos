import { Router, Request, Response } from "express";
import { getDB } from "../lib/db";
import { streaks } from "../../drizzle/schema";
import { getStreakWithFreezeRefill, useFreeze } from "../services/streak";
import { requireAuth } from "../middleware/requireAuth";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/streak
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const streak = await getStreakWithFreezeRefill(userId);

    res.json({
      current: streak.current,
      longest: streak.longest,
      lastActiveDate: streak.lastActiveDate,
      freezesRemaining: streak.freezesRemaining,
    });
  } catch (error) {
    console.error("Streak error:", error);
    res.status(500).json({
      error: "Failed to fetch streak",
      ...(process.env.NODE_ENV !== "production" && {
        details: error instanceof Error ? error.message : "Unknown error"
      }),
    });
  }
});

// POST /api/streak/freeze
router.post("/freeze", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const streak = await useFreeze(userId);

    res.json({ streak });
  } catch (error: any) {
    console.error("Freeze error:", error);
    if (error.message === "No freezes remaining") {
      return res.status(400).json({ error: "No freezes remaining" });
    }
    res.status(500).json({
      error: "Failed to use freeze",
      ...(process.env.NODE_ENV !== "production" && {
        details: error instanceof Error ? error.message : "Unknown error"
      }),
    });
  }
});

export default router;
