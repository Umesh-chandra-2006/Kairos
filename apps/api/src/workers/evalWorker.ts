import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@kairos/db";
import type { DB } from "@kairos/db/client";
import { answers, questions, users } from "@kairos/db/schema";
import type { AnswerStatusDb } from "@kairos/db/schema";
import { dateStr } from "../lib/dates";
import { logger } from "../lib/logger";
import { logDomainEvent, recordEvalStarted, recordEvalCompleted, recordEvalFailed, recordLlmCall } from "../lib/obs";
import { getRuntime } from "../queue";
import type { EvalJobData } from "../queue/types";
import { getAudioStorage } from "../services/audio/storage";
import { checkLanguage } from "../services/language";
import { evaluateV2, persistEvaluation, LEGACY_SCORE_BY_BAND } from "../services/evaluator/v2";
import { getASRProvider } from "../services/providers";
import { getModelForV2 } from "../services/evaluator/v2";
import { notificationService } from "../services/notification.service";
import { streakService } from "../services/streak.service";
import { aiService } from "../services/ai.service";
import { recordReview } from "../services/spacedRepetition";
import { getOrGenerateModelAnswer } from "../services/modelAnswer";
import { generateFollowUp } from "../services/followUp";
import { updateSkillState } from "../services/skillScoring";

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
    if (job.kind === "voice") return handleVoiceJob(job);
    return handleTextJob(job);
  });

  async function handleTextJob(job: EvalJobData): Promise<void> {
    const db = getDb();
    const channel = `eval:${job.userId}:${job.answerId}`;

    // --- Atomic claim: single-statement compare-and-set ---------------------
    if (!(await claimAnswerForEval(db, job.answerId))) {
      // Already claimed by another worker, or terminal (completed/failed/cancelled).
      logDomainEvent("eval_claim_skipped", { userId: job.userId, answerId: job.answerId });
      return;
    }

    const startedAt = Date.now();
    logDomainEvent("eval_started", { userId: job.userId, answerId: job.answerId });

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

      void recordReview(db, job.userId, job.questionId, result.score).catch((err) =>
        logger.warn({ err, userId: job.userId, questionId: job.questionId }, "spaced repetition recordReview failed"),
      );

      // Background: cache model answer for this question+level if missing
      void getOrGenerateModelAnswer(db, job.questionId, level).catch((err) =>
        logger.warn({ err, questionId: job.questionId }, "model answer generation failed"),
      );

      // Background: generate follow-up for daily answers (not practice)
      if (!isPractice) {
        void generateFollowUp(db, job.answerId).catch((err) =>
          logger.warn({ err, answerId: job.answerId }, "follow-up generation failed"),
        );
      }

      logDomainEvent("eval_completed", {
        userId: job.userId,
        answerId: job.answerId,
        durationMs: Date.now() - startedAt,
        provider: result.provider,
        modelVersion: result.modelVersion,
        score: result.score,
      });
      recordEvalCompleted(Date.now() - startedAt);

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
      logDomainEvent("eval_failed", {
        userId: job.userId,
        answerId: job.answerId,
        durationMs: Date.now() - startedAt,
        outcome: message.slice(0, 200),
      });
      recordEvalFailed();
      // --- Guarded failure: demote only if we still own the row ------------
      await db
        .update(answers)
        .set({ status: "failed", errorMessage: message.slice(0, 1000) })
        .where(and(eq(answers.id, job.answerId), eq(answers.status, "processing")));
      await hub.publish(channel, { type: "error", message });
    }
  }

  /**
   * V2 voice pipeline (build-plan Wave 1):
   *   queued → transcribe (ASR) → evaluate (contract) → completed
   * Deterministic delivery metrics come from ASR words; the LLM only judges
   * content and flow. Results dual-write: evaluation_versions row + legacy
   * projection columns.
   */
  async function handleVoiceJob(job: EvalJobData): Promise<void> {
    const db = getDb();
    const channel = `eval:${job.userId}:${job.answerId}`;
    const startedAt = Date.now();

    if (!(await claimAnswerForEval(db, job.answerId))) {
      logDomainEvent("eval_claim_skipped", { userId: job.userId, answerId: job.answerId });
      return;
    }
    logDomainEvent("eval_started", { userId: job.userId, answerId: job.answerId, kind: "voice" });
    recordEvalStarted();

    try {
      const [answer] = await db.select().from(answers).where(eq(answers.id, job.answerId));
      if (!answer?.audioKey) {
        // P0-5: Without audio, the job is unrecoverable — mark as failed
        // so the row doesn't sit in "processing" forever.
        logger.warn({ job }, "voice job: answer or audio missing");
        await db
          .update(answers)
          .set({ status: "failed", errorMessage: "Audio data missing or not found" })
          .where(and(eq(answers.id, job.answerId), eq(answers.status, "processing")));
        await hub.publish(channel, { type: "error", message: "Audio data missing or not found" });
        return;
      }
      const [question] = await db.select().from(questions).where(eq(questions.id, job.questionId));
      if (!question) throw new Error("Question not found");
      const [user] = await db.select().from(users).where(eq(users.id, job.userId));
      const level = user?.profile?.level ?? "intermediate";

      await hub.publish(channel, { type: "voice_status", stage: "transcribing" });

      const audio = await getAudioStorage().get(answer.audioKey);
      if (!audio) throw new Error("Stored audio not found");
      const asr = await getASRProvider();
      const asrResult = await asr.transcribe(audio, "audio/webm");

      // P0-4: Enforce 90-second limit on actual media duration (not just client hint).
      if (asrResult.durationMs > 90_000) {
        throw new Error(`Audio duration ${Math.round(asrResult.durationMs / 1000)}s exceeds 90s limit`);
      }

      const language = checkLanguage(asrResult.transcript);
      await db
        .update(answers)
        .set({
          transcript: asrResult.transcript,
          durationMs: asrResult.durationMs,
          languageBlocked: !language.suitable,
        })
        .where(and(eq(answers.id, job.answerId), eq(answers.status, "processing")));

      // P0-1: Actually enforce language rejection — do NOT evaluate unsuitable submissions.
      if (!language.suitable) {
        await db
          .update(answers)
          .set({
            status: "completed",
            score: 0,
            feedback: `Evaluation blocked: ${language.rejectionReason}. Please answer in English.`,
            languageBlocked: true,
          })
          .where(and(eq(answers.id, job.answerId), eq(answers.status, "processing")));

        await hub.publish(channel, {
          type: "voice_done",
          overallBand: "needs_work",
          contentBand: "needs_work",
          structureBand: "needs_work",
          deliveryBand: "needs_work",
          nextAction: { instruction: "Please answer in English. Avoid Hindi or mixed-language responses.", focusDimension: "content", focusBand: "needs_work" },
          transcript: asrResult.transcript,
          score: 0,
          languageBlocked: true,
        });

        logDomainEvent("eval_completed", {
          userId: job.userId,
          answerId: job.answerId,
          kind: "voice",
          durationMs: Date.now() - startedAt,
          provider: asr.name,
          outcome: `language_rejected: ${language.rejectionReason}`,
        });
        recordEvalCompleted(Date.now() - startedAt);
        return;
      }

      await hub.publish(channel, { type: "voice_status", stage: "evaluating" });

      const result = await evaluateV2(
        {
          answerId: job.answerId,
          questionText: question.text,
          rubricHints: question.rubricHints,
          level,
          transcript: asrResult.transcript,
          words: asrResult.words,
          durationMs: asrResult.durationMs,
          hasRealTimestamps: asrResult.hasRealTimestamps,
        },
        getModelForV2(),
      );
      await persistEvaluation(db, job.answerId, result);

      // Update skill state from evaluation dimensions
      void updateSkillState(db, job.userId, result, job.answerId).catch((err) =>
        logger.warn({ err, userId: job.userId, answerId: job.answerId }, "skill scoring failed"),
      );

      void recordReview(db, job.userId, job.questionId, LEGACY_SCORE_BY_BAND[result.overallBand]).catch((err) =>
        logger.warn({ err, userId: job.userId, questionId: job.questionId }, "spaced repetition recordReview failed"),
      );

      logDomainEvent("eval_completed", {
        userId: job.userId,
        answerId: job.answerId,
        kind: "voice",
        durationMs: Date.now() - startedAt,
        provider: `${asr.name}+${result.versions.provider}`,
        outcome: `band=${result.overallBand}`,
      });
      recordEvalCompleted(Date.now() - startedAt);

      await hub.publish(channel, {
        type: "voice_done",
        overallBand: result.overallBand,
        contentBand: result.content.band,
        structureBand: result.structure.band,
        deliveryBand: result.delivery.band,
        nextAction: { instruction: result.nextAction.instruction, focusDimension: result.nextAction.focusDimension },
        transcript: asrResult.transcript,
        score: LEGACY_SCORE_BY_BAND[result.overallBand],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Voice evaluation failed";
      logger.error({ err, job }, "voice eval job failed");
      logDomainEvent("eval_failed", {
        userId: job.userId,
        answerId: job.answerId,
        kind: "voice",
        durationMs: Date.now() - startedAt,
        outcome: message.slice(0, 200),
      });
      recordEvalFailed();
      await db
        .update(answers)
        .set({ status: "failed", errorMessage: message.slice(0, 1000) })
        .where(and(eq(answers.id, job.answerId), eq(answers.status, "processing")));
      await hub.publish(channel, { type: "error", message });
    }
  }
}
