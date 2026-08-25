import type { NextFunction, Request, Response } from "express";
import { ERROR_CODES, ERROR_MESSAGES } from "@kairos/shared";
import { logger } from "../lib/logger";
import { AppError } from "../lib/http";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    error: { code: ERROR_CODES.NOT_FOUND, message: ERROR_MESSAGES[ERROR_CODES.NOT_FOUND], retryable: false },
  });
}

interface HttpErrorLike {
  status?: number;
  statusCode?: number;
  expose?: boolean;
  type?: string;
}

/** Express-level errors (body-parser, etc.) carry status/expose; they must map to
 * real status codes (malformed JSON -> 400, oversized body -> 413) instead of 500. */
function isHttpError(err: unknown): err is HttpErrorLike {
  if (!err || typeof err !== "object") return false;
  const status = (err as HttpErrorLike).status ?? (err as HttpErrorLike).statusCode;
  return (err as HttpErrorLike).expose === true && typeof status === "number";
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        retryable: err.retryable,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  if (isHttpError(err)) {
    const status = (err.status ?? err.statusCode)!;
    const message =
      err.type === "entity.parse.failed"
        ? "Malformed JSON in request body"
        : err.type === "entity.too.large"
          ? "Request body is too large"
          : ERROR_MESSAGES[ERROR_CODES.VALIDATION];
    res.status(status).json({ error: { code: ERROR_CODES.VALIDATION, message, retryable: false } });
    return;
  }

  logger.error({ err, path: req.path, requestId: req.id }, "Unhandled error");

  if (res.headersSent) {
    _next(err);
    return;
  }

  res.status(500).json({
    error: { code: ERROR_CODES.INTERNAL, message: ERROR_MESSAGES[ERROR_CODES.INTERNAL], retryable: true },
  });
}
