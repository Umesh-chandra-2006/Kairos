import { eq } from "drizzle-orm";
import { getDb } from "@kairos/db";
import { answers, questions, users } from "@kairos/db/schema";
import { dateStr } from "../lib/dates";
import { logger } from "../lib/logger";
import { getRuntime } from "../queue";
import { aiService } from "../services/ai.service";
import { notificationService } from "../services/notification.service";
import { streakService } from "../services/streak.service";

/**
 * Evaluates one submitted answer. Runs inside the job queue (BullMQ worker in
 * production, inline in-process in dev). Streams LLM tokens and terminal
 * status events to the SSE channel for the submitting client.
 */
export function registerEvalWorker(): void {
  const { queue, hub } = getRuntime();

  void queue.registerWorker(async (job) => {
    const db = getDb();
    const channel = `eval:${job.userId}:${job.answerId}`;

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

      await db
        .update(answers)
        .set({
          score: result.score,
          feedback: result.feedback,
          modelAnswer: result.modelAnswer,
          status: "completed",
          errorMessage: null,
        })
        .where(eq(answers.id, job.answerId));

      const streak = await streakService.recordActivity(db, job.userId, dateStr());

      await hub.publish(channel, {
        type: "done",
        score: result.score,
        feedback: result.feedback,
        modelAnswer: result.modelAnswer,
        streak: { current: streak.current, longest: streak.longest },
      });

      const prefs = await notificationService.getPrefs(db, job.userId);
      if (prefs.evalNotifications) {
        await notificationService.enqueueForChannels(db, job.userId, "eval_completed", {
          score: result.score,
          streak: streak.current,
          title: "Your answer is evaluated",
          body: `You scored ${result.score}/10. Current streak: ${streak.current} days.`,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Evaluation failed";
      logger.error({ err, job }, "eval job failed");
      await db
        .update(answers)
        .set({ status: "failed", errorMessage: message.slice(0, 1000) })
        .where(eq(answers.id, job.answerId));
      await hub.publish(channel, { type: "error", message });
    }
  });
}
