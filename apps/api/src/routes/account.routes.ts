import { Router } from "express";
import { getDb } from "@kairos/db";
import {
  users,
  answers,
  streaks,
  skillEvidence,
  userSkillState,
  consentLog,
  subscriptions,
  dataDeletions,
} from "@kairos/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { AppError } from "../lib/http";
import { logger } from "../lib/logger";
import type { Request, Response, NextFunction } from "express";

export const accountRouter = Router();

// --- GDPR: Export all user data ---

accountRouter.get("/export", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const userId = req.userId!;

    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name, profile: users.profile, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw AppError.notFound("User not found");

    const userAnswers = await db.select().from(answers).where(eq(answers.userId, userId));
    const userStreak = await db.select().from(streaks).where(eq(streaks.userId, userId));
    const userSkills = await db.select().from(userSkillState).where(eq(userSkillState.userId, userId));
    const userSkillEvi = await db.select().from(skillEvidence).where(eq(skillEvidence.userId, userId));
    const userConsent = await db.select().from(consentLog).where(eq(consentLog.userId, userId));
    const userSub = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profile: user.profile,
        createdAt: user.createdAt,
      },
      answers: userAnswers,
      streaks: userStreak,
      skillStates: userSkills,
      skillEvidence: userSkillEvi,
      consentHistory: userConsent,
      subscription: userSub[0] ?? null,
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="kairos-data-export-${userId}.json"`);
    res.json(exportData);
  } catch (err) {
    next(err);
  }
});

// --- GDPR: Request account deletion ---

accountRouter.post("/delete", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const userId = req.userId!;
    const { confirm } = (req.body ?? {}) as { confirm?: string };

    if (confirm !== "DELETE_MY_ACCOUNT") {
      throw AppError.validation("Please confirm deletion by sending { confirm: 'DELETE_MY_ACCOUNT' }");
    }

    const [existing] = await db
      .select()
      .from(dataDeletions)
      .where(and(eq(dataDeletions.userId, userId), eq(dataDeletions.status, "pending")))
      .limit(1);
    if (existing) {
      return res.json({ message: "Deletion already requested. We will process it within 30 days." });
    }

    await db.insert(dataDeletions).values({ userId, status: "pending" });

    // Anonymize user data immediately (soft-delete pattern)
    await db
      .update(users)
      .set({
        name: "[deleted]",
        passwordHash: "DELETED",
        profile: null,
        email: `deleted-${userId}@kairos.invalid`,
      })
      .where(eq(users.id, userId));

    res.json({ message: "Your account has been anonymized. Full deletion will occur within 30 days." });
  } catch (err) {
    next(err);
  }
});

// --- GDPR: Record consent ---

accountRouter.post("/consent", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const userId = req.userId!;
    const { consentType, granted } = (req.body ?? {}) as { consentType?: string; granted?: boolean };

    if (!consentType || typeof granted !== "boolean") {
      throw AppError.validation("consentType (string) and granted (boolean) are required");
    }

    await db.insert(consentLog).values({
      userId,
      consentType,
      granted,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]?.slice(0, 255),
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --- Account stats (for settings page) ---

accountRouter.get("/stats", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const userId = req.userId!;

    const [user] = await db
      .select({ createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const [answerCount] = await db
      .select({ count: answers.id })
      .from(answers)
      .where(eq(answers.userId, userId));

    const [streak] = await db
      .select()
      .from(streaks)
      .where(eq(streaks.userId, userId))
      .limit(1);

    res.json({
      memberSince: user?.createdAt,
      totalAnswers: answerCount?.count ?? 0,
      currentStreak: streak?.current ?? 0,
      longestStreak: streak?.longest ?? 0,
    });
  } catch (err) {
    next(err);
  }
});
