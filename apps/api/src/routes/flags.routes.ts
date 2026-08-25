import { Router } from "express";
import { FEATURE_FLAGS, type FeatureFlag } from "@kairos/shared";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { isEnabled } from "../services/flags.service";

export const flagsRouter: Router = Router();

/**
 * Client-facing feature flag resolution for the current user.
 * GET /api/flags -> { flags: { voice_v2: true, ... } }
 */
flagsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const entries = await Promise.all(
      FEATURE_FLAGS.map(async (flag: FeatureFlag) => [flag, await isEnabled(flag, { userId: req.userId! })] as const),
    );
    res.json({ flags: Object.fromEntries(entries) });
  }),
);
