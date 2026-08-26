import { Router } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getDb } from "@kairos/db";
import { answers } from "@kairos/db/schema";
import { historyQuerySchema, submitAnswerSchema } from "@kairos/shared";
import { AppError, asyncHandler } from "../lib/http";
import { verifyAccessToken } from "../lib/tokens";
import { requireAuth } from "../middleware/auth";
import { aiRateLimit } from "../middleware/rateLimit";
import { validate } from "../middleware/validate";
import { getRuntime } from "../queue";
import { answerService } from "../services/answer.service";
import { confirmBand, getConfirmation } from "../services/bandConfirmation";
import { getWeeklySummary } from "../services/stats.service";

export const answersRouter: Router = Router();

/**
 * Server-Sent Events stream for live evaluation progress. This MUST be
 * registered before the router-wide `requireAuth`: EventSource cannot set an
 * Authorization header, so auth is done via `?token=` (a normal short-lived
 * access JWT) validated inside this handler.
 */
answersRouter.get(
  "/:id/stream",
  asyncHandler(async (req, res) => {
    const token = req.query.token;
    if (typeof token !== "string" || !token) throw AppError.unauthorized();
    const payload = await verifyAccessToken(token);
    const userId = Number(payload.sub);

    const db = getDb();
    const [answer] = await db
      .select()
      .from(answers)
      .where(and(eq(answers.id, Number(req.params.id)), eq(answers.userId, userId)));
    if (!answer) throw AppError.notFound("Answer not found");

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const send = (event: unknown) => {
      try {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch {
        /* socket already closed */
      }
    };

    if (answer.status === "completed") {
      send({
        type: "done",
        score: answer.score,
        feedback: answer.feedback,
        modelAnswer: answer.modelAnswer,
        streak: null,
      });
      res.end();
      return;
    }
    if (answer.status === "failed") {
      send({ type: "error", message: answer.errorMessage ?? "Evaluation failed" });
      res.end();
      return;
    }

    const channel = `eval:${userId}:${answer.id}`;
    const hub = getRuntime().hub;
    let closed = false;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let unsubscribe: (() => void) | null = null;

    const cleanup = () => {
      if (closed) return;
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe?.();
      res.end();
    };

    unsubscribe = hub.subscribe(channel, (event) => {
      send(event);
      if (event.type === "done" || event.type === "error") cleanup();
    });
    send({ type: "status", status: answer.status });
    heartbeat = setInterval(() => send(": ping\n\n"), 15_000);
    req.on("close", cleanup);
  }),
);

answersRouter.use(requireAuth);

answersRouter.post(
  "/submit",
  aiRateLimit(),
  validate(submitAnswerSchema),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const answerId = await answerService.submit(db, req.userId!, req.body);
    res.status(201).json({ answerId });
  }),
);

answersRouter.post(
  "/practice",
  aiRateLimit(),
  validate(submitAnswerSchema),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const answerId = await answerService.submitPractice(db, req.userId!, req.body);
    res.status(201).json({ answerId });
  }),
);

answersRouter.get(
  "/",
  validate(historyQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { cursor, limit } = req.query as unknown as { cursor?: number; limit: number };
    res.json(await answerService.history(db, req.userId!, cursor, limit));
  }),
);

answersRouter.get(
  "/weekly-summary",
  asyncHandler(async (req, res) => {
    const db = getDb();
    res.json({ summary: await getWeeklySummary(db, req.userId!) });
  }),
);

answersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const db = getDb();
    res.json({ answer: await answerService.getById(db, req.userId!, Number(req.params.id)) });
  }),
);

answersRouter.get(
  "/:id/follow-up",
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { getFollowUps } = await import("../services/followUp");
    const followUps = await getFollowUps(db, Number(req.params.id));
    res.json({ followUps });
  }),
);

// ---------------------------------------------------------------------------
// Band confirmation (labeling queue)
// ---------------------------------------------------------------------------

const confirmSchema = z.object({
  confirmed: z.boolean(),
  comment: z.string().max(500).optional(),
});

answersRouter.post(
  "/:id/confirm",
  validate(confirmSchema),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const answerId = Number(req.params.id);
    const [answer] = await db
      .select({ id: answers.id, status: answers.status })
      .from(answers)
      .where(and(eq(answers.id, answerId), eq(answers.userId, req.userId!)));
    if (!answer) throw AppError.notFound("Answer not found");
    if (answer.status !== "completed") {
      throw AppError.conflict("Can only confirm completed answers");
    }
    const confirmation = await confirmBand(
      db,
      answerId,
      req.userId!,
      req.body.confirmed,
      req.body.comment,
    );
    res.json({ confirmation });
  }),
);

answersRouter.get(
  "/:id/confirmation",
  asyncHandler(async (req, res) => {
    const db = getDb();
    const confirmation = await getConfirmation(
      db,
      Number(req.params.id),
      req.userId!,
    );
    res.json({ confirmation });
  }),
);
