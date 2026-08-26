import { Router } from "express";
import { getDb } from "@kairos/db";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { getSkillProfile, getWeakSkills } from "../services/skillScoring";

export const skillsRouter: Router = Router();

skillsRouter.get(
  "/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    const db = getDb();
    const profile = await getSkillProfile(db, req.userId!);
    res.json({ skills: profile });
  }),
);

skillsRouter.get(
  "/weak",
  requireAuth,
  asyncHandler(async (req, res) => {
    const db = getDb();
    const limit = Math.min(Number(req.query.limit) || 3, 10);
    const weak = await getWeakSkills(db, req.userId!, limit);
    res.json({ weakSkills: weak });
  }),
);
