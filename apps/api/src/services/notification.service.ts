import { and, eq } from "drizzle-orm";
import { type DB } from "@kairos/db";
import {
  notificationPrefs,
  notificationOutbox,
  pushSubscriptions,
  type InsertNotificationOutbox,
  type NotificationPrefs as PrefsRow,
} from "@kairos/db/schema";
import type { NotificationPrefsInput } from "@kairos/shared";
export function toPrefs(row: PrefsRow) {
  return {
    pushEnabled: row.pushEnabled,
    evalNotifications: row.evalNotifications,
    streakReminder: row.streakReminder,
    reminderTime: row.reminderTime,
  };
}

async function getPrefsRow(db: DB, userId: number): Promise<PrefsRow> {
  const [row] = await db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, userId));
  if (row) return row;
  const [inserted] = await db.insert(notificationPrefs).values({ userId }).$returningId();
  const [fresh] = await db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, inserted!.id));
  return fresh!;
}

export const notificationService = {
  async getPrefs(db: DB, userId: number) {
    return toPrefs(await getPrefsRow(db, userId));
  },

  async updatePrefs(db: DB, userId: number, input: NotificationPrefsInput) {
    const existing = await db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, userId));
    if (existing.length === 0) {
      await db.insert(notificationPrefs).values({ userId, ...input });
    } else {
      await db.update(notificationPrefs).set(input).where(eq(notificationPrefs.userId, userId));
    }
    const row = await getPrefsRow(db, userId);
    return toPrefs(row);
  },

  async registerPush(
    db: DB,
    userId: number,
    input: { channel: "web" | "expo"; token: string; keys?: { p256dh: string; auth: string } },
  ) {
    await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.token, input.token)));
    await db.insert(pushSubscriptions).values({
      userId,
      channel: input.channel,
      token: input.token,
      keys: input.keys ?? null,
    });
  },

  async unregisterPush(db: DB, userId: number, token: string) {
    await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.token, token)));
  },

  async enqueueOutbox(db: DB, data: InsertNotificationOutbox) {
    await db.insert(notificationOutbox).values(data);
  },

  /**
   * Enqueues a notification for every push channel the user is subscribed to
   * (web + expo). Skips users with no subscriptions.
   */
  async enqueueForChannels(
    db: DB,
    userId: number,
    type: "eval_completed" | "streak_milestone" | "streak_reminder",
    payload: Record<string, unknown>,
  ) {
    const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    const channels = new Set<"web_push" | "expo_push">();
    for (const sub of subs) {
      if (sub.channel === "web") channels.add("web_push");
      if (sub.channel === "expo") channels.add("expo_push");
    }
    for (const channel of channels) {
      await db.insert(notificationOutbox).values({ userId, type, channel, payload });
    }
  },
};
