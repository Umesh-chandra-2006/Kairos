import { ERROR_CODES, ERROR_MESSAGES, type ErrorCode } from "@kairos/shared";

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message?: string,
    public readonly details?: unknown,
    /** Clients may safely auto-retry (transient failure; backoff advised). */
    public readonly retryable: boolean = false,
  ) {
    super(message ?? ERROR_MESSAGES[code]);
    this.name = "AppError";
  }

  static validation(details?: unknown): AppError {
    return new AppError(400, ERROR_CODES.VALIDATION, undefined, details);
  }

  static unauthorized(message?: string): AppError {
    return new AppError(401, ERROR_CODES.UNAUTHORIZED, message);
  }

  static forbidden(message?: string): AppError {
    return new AppError(403, ERROR_CODES.FORBIDDEN, message);
  }

  static notFound(message?: string): AppError {
    return new AppError(404, ERROR_CODES.NOT_FOUND, message);
  }

  static conflict(message?: string): AppError {
    return new AppError(409, ERROR_CODES.CONFLICT, message);
  }

  static internal(message?: string): AppError {
    return new AppError(500, ERROR_CODES.INTERNAL, message, undefined, true);
  }

  static aiUnavailable(message?: string): AppError {
    return new AppError(503, ERROR_CODES.AI_UNAVAILABLE, message, undefined, true);
  }
}

import type { NextFunction, Request, RequestHandler, Response } from "express";

/** Wraps an async handler so rejected promises flow to the error middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
