import { Router } from "express";
import { z } from "zod";
import { getDb } from "@kairos/db";
import { notificationPrefsSchema } from "@kairos/shared";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { notificationService } from "../services/notification.service";

const pushSubscribeSchema = z.object({
  channel: z.enum(["web", "expo"]),
  token: z.string().min(1).max(512),
  keys: z.object({ p256dh: z.string(), auth: z.string() }).optional(),
});

const pushUnsubscribeSchema = z.object({
  token: z.string().min(1).max(512),
});

export const notificationsRouter: Router = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get(
  "/prefs",
  asyncHandler(async (req, res) => {
    const db = getDb();
    res.json({ prefs: await notificationService.getPrefs(db, req.userId!) });
  }),
);

notificationsRouter.put(
  "/prefs",
  validate(notificationPrefsSchema),
  asyncHandler(async (req, res) => {
    const db = getDb();
    res.json({ prefs: await notificationService.updatePrefs(db, req.userId!, req.body) });
  }),
);

notificationsRouter.post(
  "/push-subscriptions",
  validate(pushSubscribeSchema),
  asyncHandler(async (req, res) => {
    const db = getDb();
    await notificationService.registerPush(db, req.userId!, req.body);
    res.status(201).json({ ok: true });
  }),
);

notificationsRouter.delete(
  "/push-subscriptions",
  validate(pushUnsubscribeSchema),
  asyncHandler(async (req, res) => {
    const db = getDb();
    await notificationService.unregisterPush(db, req.userId!, req.body.token);
    res.json({ ok: true });
  }),
);
