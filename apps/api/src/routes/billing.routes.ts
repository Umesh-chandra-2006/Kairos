import { Router, type Router as RouterType, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "@kairos/db";
import { users } from "@kairos/db/schema";
import { requireAuth } from "../middleware/auth.js";
import {
  createCheckoutSession,
  cancelSubscription,
  getCurrentSubscription,
} from "../services/subscription.js";

const router: RouterType = Router();

router.get("/plans", requireAuth, async (req: Request, res: Response) => {
  const userId = req.userId!;
  const current = await getCurrentSubscription(userId);

  res.json({
    plans: [
      {
        id: "free",
        name: "Free",
        price: 0,
        interval: "month",
        features: ["3 evals/day", "10 voice min/day", "Basic skills tracking"],
      },
      {
        id: "pro",
        name: "Pro",
        price: 999,
        currency: "INR",
        interval: "month",
        features: ["Unlimited evals", "Unlimited voice", "Full skills analytics", "Priority support"],
      },
    ],
    currentPlan: current.plan,
    currentPeriodEnd: current.currentPeriodEnd,
    cancelAtPeriodEnd: current.cancelAtPeriodEnd,
  });
});

router.post("/checkout", requireAuth, async (req: Request, res: Response) => {
  const userId = req.userId!;
  const db = getDb();
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
  if (!user) {
    res.status(404).json({ error: { message: "User not found" } });
    return;
  }

  const session = await createCheckoutSession(userId, user.email);
  res.json({ subscriptionId: session.subscriptionId, shortUrl: session.shortUrl });
});

router.post("/cancel", requireAuth, async (req: Request, res: Response) => {
  const userId = req.userId!;
  await cancelSubscription(userId);
  res.json({ ok: true, plan: "free" });
});

export default router;
