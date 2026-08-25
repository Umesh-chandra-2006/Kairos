import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { getDb } from "@kairos/db";
import { answers } from "@kairos/db/schema";
import { AppError, asyncHandler } from "../lib/http";
import { verifyAccessToken } from "../lib/tokens";
import { getRuntime } from "../queue";

export const evaluationsRouter: Router = Router();

/**
 * V2 submission stream (SSE). Same ?token= auth pattern as the V1 answer
 * stream: EventSource cannot set an Authorization header. Forwards
 * voice_status / voice_done / error events published on the worker channel.
 */
evaluationsRouter.get(
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
    if (!answer) throw AppError.notFound("Submission not found");

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
      send({ type: "voice_done", score: answer.score });
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
      if (event.type === "voice_done" || event.type === "error") cleanup();
    });
    send({ type: "voice_status", stage: answer.status === "processing" ? "transcribing" : "queued" });
    heartbeat = setInterval(() => send(": ping\n\n"), 15_000);
    req.on("close", cleanup);
  }),
);
