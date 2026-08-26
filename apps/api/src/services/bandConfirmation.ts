import { and, eq } from "drizzle-orm";
import { bandConfirmations } from "@kairos/db/schema";
import type { DB } from "@kairos/db/client";

/**
 * Record a student's band confirmation for a completed answer.
 * Unique per (answerId, userId) — upsert semantics.
 * Returns the confirmation row.
 */
export async function confirmBand(
  db: DB,
  answerId: number,
  userId: number,
  confirmed: boolean,
  comment?: string,
) {
  const existing = await db
    .select()
    .from(bandConfirmations)
    .where(
      and(
        eq(bandConfirmations.answerId, answerId),
        eq(bandConfirmations.userId, userId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(bandConfirmations)
      .set({ confirmed, comment: comment ?? null })
      .where(eq(bandConfirmations.id, existing[0]!.id));
    return { ...existing[0], confirmed, comment: comment ?? null };
  }

  const [row] = await db
    .insert(bandConfirmations)
    .values({ answerId, userId, confirmed, comment: comment ?? null })
    .execute();

  return {
    id: Number(row.insertId),
    answerId,
    userId,
    confirmed,
    comment: comment ?? null,
  };
}

/**
 * Get a student's confirmation for a specific answer (or null).
 */
export async function getConfirmation(
  db: DB,
  answerId: number,
  userId: number,
) {
  const [row] = await db
    .select()
    .from(bandConfirmations)
    .where(
      and(
        eq(bandConfirmations.answerId, answerId),
        eq(bandConfirmations.userId, userId),
      ),
    )
    .limit(1);

  return row ?? null;
}

/**
 * Get all confirmations for a student (recent first).
 */
export async function getMyConfirmations(
  db: DB,
  userId: number,
  limit = 20,
) {
  return db
    .select()
    .from(bandConfirmations)
    .where(eq(bandConfirmations.userId, userId))
    .orderBy(bandConfirmations.createdAt)
    .limit(limit);
}
