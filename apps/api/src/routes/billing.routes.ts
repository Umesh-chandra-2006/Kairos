import { Router } from "express";
import { getDb } from "@kairos/db";
import { users } from "@kairos/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { AppError } from "../lib/http";
import { logger } from "../lib/logger";
import { getSubscription, createCheckoutSession, createBillingPortalSession } from "../services/subscription";
import type { Request, Response, NextFunction } from "express";

export const billingRouter = Router();

// --- Plans & current subscription ---

billingRouter.get("/plans", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sub = await getSubscription(req.userId!);
    res.json({
      plans: [
        { id: "free", name: "Free", price: 0, evalsPerDay: 3, voiceMinutesPerDay: 10, features: ["3 evaluations/day", "10 voice minutes/day", "Basic skill tracking", "Weekly summary"] },
        { id: "pro", name: "Pro", price: 999, evalsPerDay: 999, voiceMinutesPerDay: 999, features: ["Unlimited evaluations", "Unlimited voice minutes", "Advanced skill analytics", "Priority support", "Custom practice sets"] },
      ],
      current: sub ?? { plan: "free", status: "active" },
    });
  } catch (err) {
    next(err);
  }
});

// --- Checkout session ---

billingRouter.post("/checkout", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, req.userId!)).limit(1);
    if (!user) throw AppError.notFound("User not found");
    const result = await createCheckoutSession(req.userId!, user.email);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// --- Billing portal ---

billingRouter.post("/portal", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await createBillingPortalSession(req.userId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// --- Stripe webhook (raw body) ---

billingRouter.post("/webhook", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { handleStripeWebhook } = await import("../services/subscription");
    await handleStripeWebhook(req.body as { type: string; data: { object: Record<string, unknown> } });
    res.json({ received: true });
  } catch (err) {
    logger.error({ err }, "Stripe webhook error");
    next(err);
  }
});
