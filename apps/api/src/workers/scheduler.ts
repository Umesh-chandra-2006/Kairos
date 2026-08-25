import { getDb } from "@kairos/db";
import { logger } from "../lib/logger";
import { drainOutbox, enqueueDailyReminders, enqueueWeeklySummaries } from "./notificationWorker";
import { enqueueWeeklyDigests } from "./digestWorker";

let timer: NodeJS.Timeout | null = null;

/**
 * Runs scheduled jobs: enqueue daily reminders, enqueue Monday weekly
 * summaries and coach digests, then drain the notification outbox.
 * Ticks every minute (reminders are matched to the exact HH:MM).
 */
export async function runScheduledJobs(): Promise<{ reminders: number; summaries: number; digests: number; sent: number }> {
  const db = getDb();
  const reminders = await enqueueDailyReminders(db, new Date());
  const summaries = await enqueueWeeklySummaries(db, new Date());
  const digests = await enqueueWeeklyDigests(db, new Date());
  const sent = await drainOutbox(db);
  return { reminders, summaries, digests, sent };
}

export function registerScheduler(intervalMs = 60_000): NodeJS.Timeout {
  if (timer) return timer;
  timer = setInterval(() => {
    runScheduledJobs()
      .then(({ reminders, summaries, digests, sent }) => {
        if (reminders > 0 || summaries > 0 || digests > 0 || sent > 0) {
          logger.info({ reminders, summaries, digests, sent }, "scheduled jobs completed");
        }
      })
      .catch((err) => logger.error({ err }, "scheduled jobs failed"));
  }, intervalMs);
  timer.unref?.();
  return timer;
}

export function stopScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
