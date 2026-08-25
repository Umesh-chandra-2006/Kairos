import { and, eq } from "drizzle-orm";
import { type DB } from "@kairos/db";
import { questions, type Question as QuestionRow } from "@kairos/db/schema";
import { logger } from "../lib/logger";

const POOL_TTL_MS = 5 * 60 * 1000;
let cache: QuestionRow[] | null = null;
let loadedAt = 0;

/**
 * In-memory cache of the active daily question pool (non-practice-only).
 * TTL5 minutes; avoids a full table scan on every /api/questions/today hit.
 */
export async function getDailyPool(db: DB): Promise<QuestionRow[]> {
  const now = Date.now();
  if (cache && now - loadedAt < POOL_TTL_MS) return cache;

  const rows = await db
    .select()
    .from(questions)
    .where(and(eq(questions.isActive, true), eq(questions.practiceOnly, false)));

  cache = rows;
  loadedAt = now;
  logger.debug({ count: rows.length }, "question pool refreshed");
  return rows;
}

/** Force-invalidate the pool (call after question create/update/delete). */
export function invalidateQuestionCache(): void {
  cache = null;
  loadedAt = 0;
}
