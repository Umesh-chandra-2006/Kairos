import { Router } from "express";
import express, { type RequestHandler } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@kairos/db";
import { answers, evaluationVersions, questions } from "@kairos/db/schema";
import type { EvaluationResult } from "@kairos/shared";
import { asyncHandler, AppError } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { aiRateLimit } from "../middleware/rateLimit";
import { requireEvalQuota } from "../middleware/usageLimit";
import { newAudioKey, getAudioStorage } from "../services/audio/storage";
import { getRuntime } from "../queue";

export const submissionsRouter: Router = Router();

// Raw-body upload: no multipart dependency; the browser sends the recorded
// blob as the request body. Metadata travels as query parameters.
const rawAudio: RequestHandler = express.raw({
  type: ["audio/*", "video/webm"],
  limit: "15mb",
});

const voiceMetaSchema = z.object({
  questionId: z.coerce.number().int().positive(),
  idempotencyKey: z.string().min(8).max(64),
  clientDurationMs: z.coerce.number().int().min(0).max(120_000).optional(),
});

submissionsRouter.use(requireAuth);

/**
 * Voice practice submission (Wave 1): store audio → create submission row in
 * `created` → transition to `queued` → enqueue the V2 pipeline.
 * Voice submissions are practice-only in this wave.
 */
submissionsRouter.post(
  "/voice",
  aiRateLimit(),
  requireEvalQuota,
  rawAudio,
  asyncHandler(async (req, res) => {
    const meta = voiceMetaSchema.safeParse(req.query);
    if (!meta.success) throw AppError.validation(meta.error.flatten());

    const audio = req.body as Buffer;
    if (!Buffer.isBuffer(audio) || audio.length === 0) {
      throw AppError.validation("Request body must contain audio bytes");
    }

    const db = getDb();

    // Idempotency: a retried upload with the same key returns the original
    // submission instead of double-charging ASR + LLM spend.
    const [existing] = await db
      .select({ id: answers.id, status: answers.status })
      .from(answers)
      .where(and(eq(answers.userId, req.userId!), eq(answers.idempotencyKey, meta.data.idempotencyKey)))
      .limit(1);
    if (existing) {
      res.status(200).json({ submissionId: existing.id, status: existing.status, idempotent: true });
      return;
    }

    const [question] = await db
      .select()
      .from(questions)
      .where(and(eq(questions.id, meta.data.questionId), eq(questions.isActive, true)))
      .limit(1);
    if (!question) throw AppError.notFound("Question not found");

    const audioKey = newAudioKey(req.userId!);
    await getAudioStorage().put(audioKey, audio, String(req.headers["content-type"] ?? "audio/webm"));

    let answerId: number;
    try {
      const [inserted] = await db
        .insert(answers)
        .values({
          userId: req.userId!,
          questionId: question.id,
          date: new Date().toISOString().slice(0, 10),
          dailyKey: null,
          answerText: "", // filled by the ASR transcript during processing
          status: "created",
          idempotencyKey: meta.data.idempotencyKey,
          audioKey,
        })
        .$returningId();
      answerId = inserted!.id;
    } catch (err) {
      // Don't orphan bytes for a row that was never created.
      await getAudioStorage().delete(audioKey);
      throw err;
    }

    await db.update(answers).set({ status: "queued" }).where(eq(answers.id, answerId));

    const { queue } = getRuntime();
    await queue.enqueue({ answerId, userId: req.userId!, questionId: question.id, attempt: 0, kind: "voice" });

    res.status(202).json({
      submissionId: answerId,
      status: "queued",
      streamUrl: `/api/evaluations/stream/${answerId}`,
    });
  }),
);

/**
 * Latest canonical evaluation for a submission, plus its live transcript and
 * pipeline status. This is what the web result card polls after uploading.
 */
submissionsRouter.get(
  "/:id/evaluation",
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().positive().safeParse(req.params.id);
    if (!id.success) throw AppError.validation();

    const db = getDb();
    const [row] = await db
      .select()
      .from(answers)
      .where(and(eq(answers.id, id.data), eq(answers.userId, req.userId!)))
      .limit(1);
    if (!row) throw AppError.notFound("Submission not found");

    let evaluation: EvaluationResult | null = null;
    if (row.status === "completed") {
      const [version] = await db
        .select()
        .from(evaluationVersions)
        .where(eq(evaluationVersions.answerId, row.id))
        .orderBy(desc(evaluationVersions.id))
        .limit(1);
      evaluation = version ? (version.result as unknown as EvaluationResult) : null;
    }

    res.json({
      submissionId: row.id,
      status: row.status,
      transcript: row.transcript,
      durationMs: row.durationMs,
      languageBlocked: row.languageBlocked,
      errorMessage: row.errorMessage,
      evaluation,
    });
  }),
);
