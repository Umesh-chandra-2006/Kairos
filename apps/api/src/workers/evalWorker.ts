import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@kairos/db";
import type { DB } from "@kairos/db/client";
import { answers, questions, users } from "@kairos/db/schema";
import type { AnswerStatusDb } from "@kairos/db/schema";
import { dateStr } from "../lib/dates";
import { logger } from "../lib/logger";
import { getRuntime } from "../queue";
import { aiService } from "../services/ai.service";
import { notificationService } from "../services/notification.service";
import { streakService } from "../services/streak.service";

interface ResultSetHeader {
  affectedRows?: number;
}

/**
 * Legacy-compatible claimable states: V2 uses CLAIMABLE_SUBMISSION_STATUSES
 * ("queued"), while V1 rows sit in "pending"/"evaluating" when a job arrives.
 * A crashed "processing" row is re-claimable only via the Phase 1 janitor,
 * which owns stale-row recovery for the submission service.
 */
const CLAIMABLE_ANSWER_STATUSES: readonly AnswerStatusDb[] = ["pending", "evaluating", "queued"];

function affectedRows(res: unknown): number {
  const first = (res as [ResultSetHeader, unknown] | undefined)?.[0];
  return first?.affectedRows ?? 0;
}

/**
 * Atomic compare-and-set claim: flips a claimable answer to "processing" in a
 * single conditional UPDATE. Returns true iff this caller won the row.
 */
export async function claimAnswerForEval(db: DB, answerId: number): Promise<boolean> {
  const res = await db
    .update(answers)
    .set({ status: "processing", errorMessage: null })
    .where(and(eq(answers.id, answerId), inArray(answers.status, [...CLAIMABLE_ANSWER_STATUSES])));
  return affectedRows(res) > 0;
}

interface ResultSetHeader {
  affectedRows?: number;
}

/**
 * Evaluates one submitted answer. Runs inside the job queue (BullMQ worker in
 * production, inline in-process in dev). Streams LLM tokens and terminal
 * status events to the SSE channel for the submitting client.
 *
 * Claim semantics (build-plan §0.4): the DB row itself is the lock. Exactly
 * one caller can flip a claimable status to "processing" in a single
 * conditional UPDATE; duplicate jobs and concurrent workers no-op instead of
 * double-spending LLM calls.
 */
export function registerEvalWorker(): void {
  const { queue, hub } = getRuntime();

  void queue.registerWorker(async (job) => {
    const db = getDb();
    const channel = `eval:${job.userId}:${job.answerId}`;

    // --- Atomic claim: single-statement compare-and-set ---------------------
    if (!(await claimAnswerForEval(db, job.answerId))) {
      // Already claimed by another worker, or terminal (completed/failed/cancelled).
      logger.info({ job }, "eval job: answer not claimable; skipping");
      return;
    }

    try {
      await hub.publish(channel, { type: "status", status: "evaluating" });

      const [answer] = await db.select().from(answers).where(eq(answers.id, job.answerId));
      if (!answer) {
        logger.warn({ job }, "eval job: answer missing");
        return;
      }
      const [question] = await db.select().from(questions).where(eq(questions.id, job.questionId));
      if (!question) {
        throw new Error("Question not found");
      }
      const [user] = await db.select().from(users).where(eq(users.id, job.userId));
      const level = user?.profile?.level ?? "intermediate";

      const result = await aiService.evaluate({
        questionId: question.id,
        questionText: question.text,
        rubricHints: question.rubricHints,
        level,
        answerText: answer.answerText,
        userId: job.userId,
        answerId: job.answerId,
        hub,
      });

      // --- Guarded completion: only a row we still own may complete --------
      await db
        .update(answers)
        .set({
          score: result.score,
          feedback: result.feedback,
          modelAnswer: result.modelAnswer,
          status: "completed",
          errorMessage: null,
        })
        .where(and(eq(answers.id, job.answerId), eq(answers.status, "processing")));

      // Practice answers (dailyKey = NULL) never affect the daily streak.
      const isPractice = answer.dailyKey === null;
      const streak = isPractice ? null : await streakService.recordActivity(db, job.userId, dateStr());

      await hub.publish(channel, {
        type: "done",
        score: result.score,
        feedback: result.feedback,
        modelAnswer: result.modelAnswer,
        streak: streak ? { current: streak.current, longest: streak.longest } : null,
      });

      const prefs = await notificationService.getPrefs(db, job.userId);
      if (prefs.evalNotifications) {
        await notificationService.enqueueForChannels(db, job.userId, "eval_completed", {
          score: result.score,
          streak: streak?.current ?? null,
          title: isPractice ? "Practice answer evaluated" : "Your answer is evaluated",
          body: `You scored ${result.score}/10.${streak ? ` Current streak: ${streak.current} days.` : ""}`,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Evaluation failed";
      logger.error({ err, job }, "eval job failed");
      // --- Guarded failure: demote only if we still own the row ------------
      await db
        .update(answers)
        .set({ status: "failed", errorMessage: message.slice(0, 1000) })
        .where(and(eq(answers.id, job.answerId), eq(answers.status, "processing")));
      await hub.publish(channel, { type: "error", message });
    }
  });
}
