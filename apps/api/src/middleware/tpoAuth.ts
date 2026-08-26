import { eq } from "drizzle-orm";
import { getDb } from "@kairos/db";
import { users } from "@kairos/db/schema";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/http";

/**
 * Require authenticated user with role = "tpo".
 * Must be used AFTER requireAuth (req.userId is set).
 * For Wave 2: simple role check, no RBAC framework.
 */
export async function requireTpoAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (!req.userId) {
    next(AppError.unauthorized());
    return;
  }
  const db = getDb();
  const [user] = await db
    .select({ role: users.role, collegeId: users.collegeId })
    .from(users)
    .where(eq(users.id, req.userId));

  if (!user || user.role !== "tpo") {
    next(AppError.forbidden("TPO access required"));
    return;
  }
  if (!user.collegeId) {
    next(AppError.forbidden("TPO user has no college assignment"));
    return;
  }

  req.collegeId = user.collegeId;
  next();
}
