import { Router, Request, Response } from "express";
import { User } from "../models/User";
import { Streak } from "../models/Streak";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";

const router = Router();

// POST /api/auth/sync — requires auth, called on every app launch
router.post(
  "/sync",
  requireAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, email } = req.body as {
        name: string;
        email: string;
      };

      const clerkId = req.clerkId; // Extract from verified JWT, not from request body
      if (!clerkId || !name || !email) {
        res.status(400).json({ error: "name and email are required, clerkId extracted from JWT" });
        return;
      }

    const result = await User.findOneAndUpdate(
      { clerkId },
      { $setOnInsert: { clerkId, name, email, profile: { role: null, level: null, targets: [], notificationTime: "09:00" } } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // If this was a new user (upserted), create streak document
    const existingStreak = await Streak.findOne({ userId: result!._id });
    if (!existingStreak) {
      await Streak.create({
        userId: result!._id,
        current: 0,
        longest: 0,
        lastActiveDate: "",
        freezesRemaining: 1,
        lastFreezeRefill: "",
      });
    }

    res.status(200).json({ user: result });
  } catch (err) {
    throw err;
  }
  }
);

// POST /api/auth/onboarding — requires auth
router.post(
  "/onboarding",
  requireAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { role, level, targets, notificationTime } = req.body as {
        role: "student" | "professional";
        level: "beginner" | "intermediate" | "advanced";
        targets: string[];
        notificationTime: string;
      };

      const user = await User.findOneAndUpdate(
        { clerkId: req.clerkId },
        { $set: { "profile.role": role, "profile.level": level, "profile.targets": targets, "profile.notificationTime": notificationTime } },
        { new: true }
      );

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.status(200).json({ user });
    } catch (err) {
      throw err;
    }
  }
);

export default router;
