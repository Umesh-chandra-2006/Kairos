import { and, desc, eq, gte } from "drizzle-orm";
import { type DB } from "@kairos/db";
import { answers, notificationOutbox, users } from "@kairos/db/schema";
import { isMonday } from "../lib/dates";
import { logger } from "../lib/logger";
import { generateWeeklyDigest } from "../services/coachDigest";

/**
 * Enqueue weekly coach digests for active users on Mondays.
 * Each digest is an AI-generated summary of the user's week.
 */
export async function enqueueWeeklyDigests(db: DB, now = new Date()): Promise<number> {
  if (!isMonday(now)) return 0;

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const activeUserIds = await db
    .selectDistinct({ userId: answers.userId })
    .from(answers)
    .where(gte(answers.createdAt, weekAgo));

  let enqueued = 0;
  for (const { userId } of activeUserIds) {
    try {
      const [existing] = await db
        .select({ id: notificationOutbox.id })
        .from(notificationOutbox)
        .where(
          and(
            eq(notificationOutbox.userId, userId),
            eq(notificationOutbox.type, "weekly_digest"),
          ),
        )
        .limit(1);
      if (existing) continue;

      const summary = await generateWeeklyDigest(db, userId);
      if (!summary) continue;

      await db.insert(notificationOutbox).values({
        userId,
        type: "weekly_digest",
        channel: "web_push",
        payload: {
          title: "Your weekly coaching summary",
          body: summary.slice(0, 200),
          summary,
        },
      });
      enqueued++;
    } catch (err) {
      logger.warn({ err, userId }, "weekly digest enqueue failed");
    }
  }

  return enqueued;
}
