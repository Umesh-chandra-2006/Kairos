import { eq } from "drizzle-orm";
import { getDb } from "@kairos/db";
import { users } from "@kairos/db/schema";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/http";
import { verifyAccessToken } from "../lib/tokens";

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearer(req);
  if (!token) {
    next(AppError.unauthorized());
    return;
  }
  try {
    const payload = await verifyAccessToken(token);
    req.userId = Number(payload.sub);
    next();
  } catch {
    next(AppError.unauthorized("Invalid or expired token"));
  }
}

/** Attaches req.userId when a valid token is present, without rejecting. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearer(req);
  if (token) {
    try {
      const payload = await verifyAccessToken(token);
      req.userId = Number(payload.sub);
    } catch {
      /* ignore */
    }
  }
  next();
}

export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.userId) {
    next(AppError.unauthorized());
    return;
  }
  const db = getDb();
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, req.userId));
  if (!user || user.role !== "admin") {
    next(AppError.forbidden());
    return;
  }
  next();
}
