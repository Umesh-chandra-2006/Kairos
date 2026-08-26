import { Router, type Router as RouterType, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { authRateLimit } from "../middleware/rateLimit.js";
import { getReferralStats, applyReferralCode } from "../services/referral.js";
import { z } from "zod";

const router: RouterType = Router();

router.get("/referral", requireAuth, async (req: Request, res: Response) => {
  const stats = await getReferralStats(req.userId!);
  res.json(stats);
});

router.post("/referral/apply", requireAuth, authRateLimit(), async (req: Request, res: Response) => {
  const schema = z.object({ code: z.string().min(4).max(16) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { message: "Invalid referral code", details: parsed.error.issues } });
    return;
  }

  const result = await applyReferralCode(req.userId!, parsed.data.code);
  if (!result.ok) {
    res.status(400).json({ error: { message: result.error } });
    return;
  }
  res.json({ ok: true });
});

export default router;
