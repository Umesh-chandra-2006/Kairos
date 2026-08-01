import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../lib/http";

type Source = "body" | "query" | "params";

export function validate<T extends ZodType>(schema: T, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const input = req[source];
    const result = schema.safeParse(input ?? {});
    if (!result.success) {
      next(AppError.validation(result.error.issues));
      return;
    }
    // Attach the parsed, coerced value back onto the request.
    (req as unknown as Record<string, unknown>)[source] = result.data;
    next();
  };
}
