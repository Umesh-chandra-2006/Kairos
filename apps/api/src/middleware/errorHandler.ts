import type { NextFunction, Request, Response } from "express";
import { ERROR_CODES, ERROR_MESSAGES } from "@kairos/shared";
import { logger } from "../lib/logger";
import { AppError } from "../lib/http";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    error: { code: ERROR_CODES.NOT_FOUND, message: ERROR_MESSAGES[ERROR_CODES.NOT_FOUND] },
  });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details !== undefined ? { details: err.details } : {}) },
    });
    return;
  }

  logger.error({ err, path: req.path }, "Unhandled error");

  if (res.headersSent) {
    _next(err);
    return;
  }

  res.status(500).json({
    error: { code: ERROR_CODES.INTERNAL, message: ERROR_MESSAGES[ERROR_CODES.INTERNAL] },
  });
}
