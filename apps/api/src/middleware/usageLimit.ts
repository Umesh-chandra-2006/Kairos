import type { NextFunction, Request, Response } from "express";
import { canPerformEval } from "../services/subscription";
import { AppError } from "../lib/http";
import { logger } from "../lib/logger";

/**
 * Rate-limits eval submissions based on subscription plan.
 * Free tier: 3 evals/day. Pro: unlimited.
 */
export async function requireEvalQuota(req: Request, _res: Response, next: NextFunction) {
  if (!req.userId) {
    next(AppError.unauthorized());
    return;
  }
  try {
    const { allowed, remaining } = await canPerformEval(req.userId);
    if (!allowed) {
      next(
        AppError.forbidden(
          "You've reached your daily limit of 3 evaluations. Upgrade to Pro for unlimited access.",
        ),
      );
      return;
    }
    next();
  } catch (err) {
    logger.error({ err }, "Usage check failed");
    next(err);
  }
}
