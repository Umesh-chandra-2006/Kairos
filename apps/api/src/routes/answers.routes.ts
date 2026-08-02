import { Router } from "express";
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
import { getWeeklySummary } from "../services/stats.service";

export const answersRouter: Router = Router();

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

/**
 * Server-Sent Events stream for live evaluation progress. Auth via ?token=
 * (EventSource cannot set Authorization headers); the token is a normal short
 * access JWT.
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
      res.write(`data: ${JSON.stringify(event)}\n\n`);
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
    const unsubscribe = hub.subscribe(channel, (event) => send(event));
    send({ type: "status", status: answer.status });

    const heartbeat = setInterval(() => res.write(": ping\n\n"), 15_000);
    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  }),
);
