import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";
import { User } from "../models/User";
import { Streak } from "../models/Streak";

const router = Router();

router.use(requireAuth);

// GET /api/streak
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findOne({ clerkId: req.clerkId });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const streak = await Streak.findOne({ userId: user._id });
    if (!streak) {
      res.status(404).json({ error: "Streak not found" });
      return;
    }

    // Monday freeze refill logic
    const today = new Date().toISOString().split("T")[0];
    const todayDate = new Date();
    const isMonday = todayDate.getDay() === 1; // 0=Sun, 1=Mon
    if (isMonday && streak.lastFreezeRefill !== today) {
      streak.freezesRemaining = 1;
      streak.lastFreezeRefill = today;
      await streak.save();
    }

    res.status(200).json({
      current: streak.current,
      longest: streak.longest,
      lastActiveDate: streak.lastActiveDate,
      freezesRemaining: streak.freezesRemaining,
    });
  } catch (err) {
    throw err;
  }
});

// POST /api/streak/freeze
router.post("/freeze", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findOne({ clerkId: req.clerkId });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const streak = await Streak.findOne({ userId: user._id });
    if (!streak) {
      res.status(404).json({ error: "Streak not found" });
      return;
    }

    if (streak.freezesRemaining < 1) {
      res.status(400).json({ error: "No freezes remaining" });
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    streak.freezesRemaining -= 1;
    streak.lastActiveDate = today;
    await streak.save();

    res.status(200).json({ streak });
  } catch (err) {
    throw err;
  }
});

export default router;
