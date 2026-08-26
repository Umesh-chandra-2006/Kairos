import { Router } from "express";
import { z } from "zod";
import { getDb } from "@kairos/db";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { requireTpoAuth } from "../middleware/tpoAuth";
import { validate } from "../middleware/validate";
import {
  getActivationStats,
  getImprovementTrend,
  getWeakSkills,
  getStudentsNeedingIntervention,
  getPlacementReadinessTrend,
  getBandConfirmationStats,
  logTpoView,
} from "../services/tpo.service";

export const tpoRouter: Router = Router();

tpoRouter.use(requireAuth, requireTpoAuth);

const dateRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

tpoRouter.get(
  "/activation",
  validate(dateRangeSchema, "query"),
  asyncHandler(async (req, res) => {
    const db = getDb();
    await logTpoView(db, req.userId!, req.collegeId!, "activation");
    res.json({ students: await getActivationStats(db, req.collegeId!) });
  }),
);

tpoRouter.get(
  "/improvement",
  validate(dateRangeSchema, "query"),
  asyncHandler(async (req, res) => {
    const db = getDb();
    await logTpoView(db, req.userId!, req.collegeId!, "improvement");
    res.json({ students: await getImprovementTrend(db, req.collegeId!) });
  }),
);

tpoRouter.get(
  "/weak-skills",
  asyncHandler(async (req, res) => {
    const db = getDb();
    await logTpoView(db, req.userId!, req.collegeId!, "weak_skills");
    res.json({ skills: await getWeakSkills(db, req.collegeId!) });
  }),
);

tpoRouter.get(
  "/intervention",
  asyncHandler(async (req, res) => {
    const db = getDb();
    await logTpoView(db, req.userId!, req.collegeId!, "intervention");
    res.json({
      students: await getStudentsNeedingIntervention(db, req.collegeId!),
    });
  }),
);

tpoRouter.get(
  "/readiness-trend",
  asyncHandler(async (req, res) => {
    const db = getDb();
    await logTpoView(db, req.userId!, req.collegeId!, "readiness_trend");
    res.json({ weeks: await getPlacementReadinessTrend(db, req.collegeId!) });
  }),
);

tpoRouter.get(
  "/calibration-stats",
  asyncHandler(async (req, res) => {
    const db = getDb();
    await logTpoView(db, req.userId!, req.collegeId!, "calibration_stats");
    res.json({
      stats: await getBandConfirmationStats(db, req.collegeId!),
    });
  }),
);
