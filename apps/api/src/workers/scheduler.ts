import { getDb } from "@kairos/db";
import { logger } from "../lib/logger";
import { drainOutbox, enqueueDailyReminders } from "./notificationWorker";

let timer: NodeJS.Timeout | null = null;

/**
 * Runs scheduled jobs: enqueue daily reminders, then drain the notification
 * outbox. Ticks every minute (reminders are matched to the exact HH:MM).
 */
export async function runScheduledJobs(): Promise<{ reminders: number; sent: number }> {
  const db = getDb();
  const reminders = await enqueueDailyReminders(db, new Date());
  const sent = await drainOutbox(db);
  return { reminders, sent };
}

export function registerScheduler(intervalMs = 60_000): NodeJS.Timeout {
  if (timer) return timer;
  timer = setInterval(() => {
    runScheduledJobs()
      .then(({ reminders, sent }) => {
        if (reminders > 0 || sent > 0) {
          logger.info({ reminders, sent }, "scheduled jobs completed");
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
