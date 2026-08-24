import path from "node:path";
import fs from "node:fs";
import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { corsOrigins, getEnv, getProjectRoot } from "@kairos/config";
import { getPool } from "@kairos/db/client";
import { logger } from "./lib/logger";
import { getRedis, redisReady } from "./lib/cache";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { generalRateLimit } from "./middleware/rateLimit";
import { apiRouter } from "./routes";

const webDist = path.join(getProjectRoot(), "apps", "web", "dist");

export function createApp(): Express {
  const env = getEnv();
  const app = express();

  app.set("trust proxy", 1);
  app.use(pinoHttp({ logger }));
  app.use(helmet());
  app.use(cors({ origin: corsOrigins(env), credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/healthz", (_req, res) => {
    res.status(200).json({ ok: true });
  });
  app.get("/readyz", async (_req, res) => {
    const checks: Record<string, boolean> = { db: false, redis: false };
    try {
      await getPool().query("SELECT 1");
      checks.db = true;
    } catch (err) {
      logger.warn({ err }, "Ready check failed: database unreachable");
    }
    const redis = getRedis();
    if (redis) {
      try {
        if (await redisReady()) {
          await redis.ping();
          checks.redis = true;
        }
      } catch {
        checks.redis = false;
      }
    }
    const ok = checks.db && checks.redis;
    res.status(ok ? 200 : 503).json({ ok, checks });
  });

  app.use("/api", generalRateLimit());

  app.use("/api", apiRouter);

  if (process.env.NODE_ENV === "production" && fs.existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get("*", (req, res, next) => {
      const pathname = req.path;
      // Keep /api and hashed /assets responses as real 404s instead of the SPA shell.
      if (pathname.startsWith("/api") || pathname.startsWith("/assets")) return next();
      res.sendFile(path.join(webDist, "index.html"));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
