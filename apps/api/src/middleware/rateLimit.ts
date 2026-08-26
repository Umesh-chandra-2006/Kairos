import { getEnv } from "@kairos/config";
import { rateLimit } from "express-rate-limit";
import { ERROR_CODES, ERROR_MESSAGES } from "@kairos/shared";
import type { Request, Response } from "express";

function makeLimit({
  windowMs,
  max,
  keyGenerator,
}: {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
}) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator,
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: ERROR_CODES.RATE_LIMITED,
          message: ERROR_MESSAGES[ERROR_CODES.RATE_LIMITED],
          retryable: true,
        },
      });
    },
  });
}

export function generalRateLimit() {
  const env = getEnv();
  return makeLimit({ windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.RATE_LIMIT_MAX });
}

export function authRateLimit() {
  const env = getEnv();
  return makeLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_AUTH_MAX,
    keyGenerator: (req) => (req.ip ?? "unknown") + ":" + String(req.body?.email ?? ""),
  });
}

export function aiRateLimit() {
  const env = getEnv();
  return makeLimit({
    windowMs: 60_000,
    max: env.RATE_LIMIT_AI_MAX,
    keyGenerator: (req) => String(req.userId ?? req.ip ?? "unknown"),
  });
}

export function registrationRateLimit() {
  return makeLimit({
    windowMs: 60_000,
    max: 20,
    keyGenerator: (req) => "reg:" + (req.ip ?? "unknown"),
  });
}
