import { and, eq, gte, inArray } from "drizzle-orm";
import { getEnv } from "@kairos/config";
import { sendEmail } from "@kairos/email";
import { getDb, type DB } from "@kairos/db";
import {
  answers,
  notificationOutbox,
  notificationPrefs,
  pushSubscriptions,
  users,
  type NotificationOutbox,
} from "@kairos/db/schema";
import webpush from "web-push";
import { dateStr } from "../lib/dates";
import { logger } from "../lib/logger";

const MAX_ATTEMPTS = 5;

function webPushClient(): typeof webpush | null {
  const { WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY, WEB_PUSH_SUBJECT } = getEnv();
  if (!WEB_PUSH_PUBLIC_KEY || !WEB_PUSH_PRIVATE_KEY) return null;
  webpush.setVapidDetails(
    WEB_PUSH_SUBJECT ?? "mailto:admin@kairos.dev",
    WEB_PUSH_PUBLIC_KEY,
    WEB_PUSH_PRIVATE_KEY,
  );
  return webpush;
}

async function sendWebPush(db: DB, entry: NotificationOutbox, payload: Record<string, unknown>): Promise<void> {
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, entry.userId), eq(pushSubscriptions.channel, "web")));

  const client = webPushClient();
  if (!client) {
    logger.info({ entryId: entry.id, subs: subs.length }, "[push:dry-run] web push not configured");
    return;
  }

  const body = JSON.stringify({ title: payload.title, body: payload.body, data: payload });
  for (const sub of subs) {
    if (!sub.keys) continue;
    try {
      await client.sendNotification({ endpoint: sub.token, keys: sub.keys }, body, { TTL: 86_400 });
    } catch (err) {
      logger.warn({ err, entryId: entry.id, userId: entry.userId }, "web push delivery failed");
    }
  }
}

async function sendExpoPush(db: DB, entry: NotificationOutbox, payload: Record<string, unknown>): Promise<void> {
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, entry.userId), eq(pushSubscriptions.channel, "expo")));

  if (subs.length === 0) return;

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(
      subs.map((sub) => ({
        to: sub.token,
        title: payload.title ?? "Kairos",
        body: payload.body ?? "",
        sound: "default",
        data: payload.data,
      })),
    ),
  });
  if (!res.ok) {
    throw new Error(`Expo push API responded ${res.status}`);
  }
}

async function sendEmailEntry(db: DB, entry: NotificationOutbox, payload: Record<string, unknown>): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, entry.userId));
  if (!user) return;
  const ok = await sendEmail({
    to: user.email,
    subject: String(payload.title ?? "Kairos"),
    html: `<p>${String(payload.body ?? "")}</p>`,
    text: String(payload.body ?? ""),
  });
  if (!ok) throw new Error("Email send failed");
}

/**
 * Delivers one pending outbox entry to its channel. Missing subscriptions or
 * an unconfigured channel are treated as success (nothing to deliver, no
 * retry loop). Real delivery failures throw so the caller can retry.
 */
export async function deliverOutboxEntry(db: DB, entry: NotificationOutbox): Promise<void> {
  const payload = (entry.payload ?? {}) as Record<string, unknown>;
  switch (entry.channel) {
    case "web_push":
      await sendWebPush(db, entry, payload);
      break;
    case "expo_push":
      await sendExpoPush(db, entry, payload);
      break;
    case "email":
      await sendEmailEntry(db, entry, payload);
      break;
  }
}

/**
 * Drains pending outbox entries, marking them sent or failed (after
 * MAX_ATTEMPTS). Runs on the scheduler tick.
 */
export async function drainOutbox(db: DB, limit = 100): Promise<number> {
  const pending = await db
    .select()
    .from(notificationOutbox)
    .where(eq(notificationOutbox.status, "pending"))
    .limit(limit);

  let sent = 0;
  for (const entry of pending) {
    try {
      await deliverOutboxEntry(db, entry);
      await db
        .update(notificationOutbox)
        .set({ status: "sent", sentAt: new Date(), error: null })
        .where(eq(notificationOutbox.id, entry.id));
      sent += 1;
    } catch (err) {
      const attempts = entry.attempts + 1;
      const failed = attempts >= MAX_ATTEMPTS;
      await db
        .update(notificationOutbox)
        .set({
          attempts,
          status: failed ? "failed" : "pending",
          lastAttemptAt: new Date(),
          error: err instanceof Error ? err.message.slice(0, 1000) : "Send failed",
        })
        .where(eq(notificationOutbox.id, entry.id));
      logger.warn({ entryId: entry.id, attempts, failed }, "notification delivery failed");
    }
  }
  return sent;
}

function localTime(timeZone: string | null | undefined, now: Date): string | null {
  const tz = timeZone || "UTC";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(now);
    const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
    const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
    return `${hour}:${minute}`;
  } catch {
    return null;
  }
}

/**
 * Enqueues a daily streak reminder for users whose reminderTime matches their
 * local time, have push enabled, have at least one push subscription, and
 * haven't answered today. Idempotent per (user, channel) for the day.
 */
export async function enqueueDailyReminders(db: DB, now = new Date()): Promise<number> {
  const today = dateStr(now);

  const prefs = await db
    .select({
      userId: notificationPrefs.userId,
      reminderTime: notificationPrefs.reminderTime,
    })
    .from(notificationPrefs)
    .where(
      and(
        eq(notificationPrefs.streakReminder, true),
        eq(notificationPrefs.pushEnabled, true),
      ),
    );

  if (prefs.length === 0) return 0;

  const userIds = prefs.map((p) => p.userId);

  const [usersRows, subsRows, answeredRows] = await Promise.all([
    db.select({ id: users.id, timezone: users.timezone }).from(users).where(inArray(users.id, userIds)),
    db.select().from(pushSubscriptions).where(and(eq(pushSubscriptions.channel, "web"), inArray(pushSubscriptions.userId, userIds))),
    db.select({ userId: answers.userId }).from(answers).where(and(eq(answers.date, today), inArray(answers.userId, userIds))),
  ]);

  const answeredToday = new Set(answeredRows.map((r) => r.userId));
  const byUser = new Map<number, typeof usersRows[number]>();
  for (const u of usersRows) byUser.set(u.id, u);

  const webTokens = new Map<number, number>(); // userId -> count
  for (const s of subsRows) webTokens.set(s.userId, (webTokens.get(s.userId) ?? 0) + 1);

  const expoTokens = new Map<number, number>();
  const expoSubs = await db
    .select()
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.channel, "expo"), inArray(pushSubscriptions.userId, userIds)));
  for (const s of expoSubs) expoTokens.set(s.userId, (expoTokens.get(s.userId) ?? 0) + 1);

  const todayStart = new Date(`${today}T00:00:00Z`);
  const existing = await db
    .select({ userId: notificationOutbox.userId, channel: notificationOutbox.channel })
    .from(notificationOutbox)
    .where(
      and(
        eq(notificationOutbox.type, "streak_reminder"),
        gte(notificationOutbox.createdAt, todayStart),
        inArray(notificationOutbox.userId, userIds),
      ),
    );
  const already = new Set(existing.map((e) => `${e.userId}:${e.channel}`));

  let enqueued = 0;
  for (const p of prefs) {
    if (answeredToday.has(p.userId)) continue;
    const user = byUser.get(p.userId);
    if (!user) continue;
    if (localTime(user.timezone, now) !== p.reminderTime) continue;

    const channels: Array<"web_push" | "expo_push"> = [];
    if ((webTokens.get(p.userId) ?? 0) > 0) channels.push("web_push");
    if ((expoTokens.get(p.userId) ?? 0) > 0) channels.push("expo_push");
    if (channels.length === 0) continue;

    for (const channel of channels) {
      if (already.has(`${p.userId}:${channel}`)) continue;
      await db.insert(notificationOutbox).values({
        userId: p.userId,
        type: "streak_reminder",
        channel,
        payload: {
          title: "Time for your daily question",
          body: "Keep your streak alive — answer today's interview question.",
        },
      });
      enqueued += 1;
    }
  }
  return enqueued;
}
