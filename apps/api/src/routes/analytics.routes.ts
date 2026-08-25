import { Router } from "express";
import { z } from "zod";
import { getDb } from "@kairos/db";
import { analyticsEvents } from "@kairos/db/schema";
import { FUNNEL_EVENTS } from "@kairos/shared";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";

export const analyticsRouter: Router = Router();

const eventSchema = z.object({
  name: z.enum(FUNNEL_EVENTS),
  props: z.record(z.string(), z.unknown()).optional(),
  clientTs: z.coerce.date().optional(),
  collegeId: z.string().max(64).optional(),
});

const batchSchema = z.object({
  events: z.array(eventSchema).min(1).max(100),
});

analyticsRouter.use(requireAuth);

/**
 * Batch ingest for funnel telemetry. Clients buffer events locally and drain
 * them here; userId is stamped server-side from the access token.
 */
analyticsRouter.post(
  "/events",
  asyncHandler(async (req, res) => {
    const parsed = batchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid analytics batch" } });
      return;
    }

    const rows = parsed.data.events.map((e) => ({
      userId: req.userId!,
      collegeId: e.collegeId ?? null,
      name: e.name,
      props: e.props ?? null,
      clientTs: e.clientTs ?? null,
    }));

    await getDb().insert(analyticsEvents).values(rows);
    res.status(202).json({ accepted: rows.length });
  }),
);
