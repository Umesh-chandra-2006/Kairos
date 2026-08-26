import { Router } from "express";
import { getPool } from "@kairos/db";
import { redisReady } from "../lib/cache";
import { getMetrics } from "../lib/obs";

export const healthRouter: Router = Router();

healthRouter.get("/health", async (_req, res) => {
  let dbOk = true;
  let redisOk: boolean | "not-configured" = "not-configured";

  try {
    const [rows] = await getPool().query("SELECT 1 AS ok");
    dbOk = Array.isArray(rows) && (rows as Array<{ ok: number }>)[0]?.ok === 1;
  } catch {
    dbOk = false;
  }

  redisOk = await redisReady();

  res.status(dbOk ? 200 : 503).json({
    ok: dbOk,
    db: dbOk,
    redis: redisOk,
    uptime: Math.round(process.uptime()),
    version: "0.1.0",
  });
});

healthRouter.get("/health/metrics", (_req, res) => {
  const metrics = getMetrics();
  res.json(metrics);
});
