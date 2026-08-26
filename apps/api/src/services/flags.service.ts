import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@kairos/db";
import { featureFlags } from "@kairos/db/schema";
import { getEnv } from "@kairos/config";
import { FEATURE_FLAGS, type FeatureFlag } from "@kairos/shared";
import type { DB } from "@kairos/db/client";

/**
 * Feature flag resolution (build-plan §0.5). Precedence:
 *   1. (flag, current env, collegeId) row
 *   2. (flag, current env, NULL) environment-wide row
 *   3. default = disabled
 *
 * Rows are cached in memory for a short TTL so checks never add query
 * latency on hot paths. `invalidateFlagCache()` forces a reload (used by
 * tests and future admin endpoints).
 *
 * Percentage rollout buckets deterministically on (flag, userId) so the same
 * user always lands in the same cohort while a flag is ramping.
 */

const CACHE_TTL_MS = 30_000;

type CacheEntry = { enabled: boolean; rolloutPercent: number; loadedAt: number };
const cache = new Map<string, CacheEntry>();

function bucket(flag: FeatureFlag, userId: number | undefined): number {
  if (userId === undefined) return 0;
  let h = 2166136261;
  const input = `${flag}:${userId}`;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100;
}

async function loadRow(
  db: DB,
  key: FeatureFlag,
  envScope: "development" | "test" | "production",
  collegeId: string | null,
): Promise<CacheEntry | null> {
  const scopeFilter =
    collegeId === null
      ? and(eq(featureFlags.key, key), eq(featureFlags.envScope, envScope), isNull(featureFlags.collegeId))
      : and(
          eq(featureFlags.key, key),
          eq(featureFlags.envScope, envScope),
          eq(featureFlags.collegeId, collegeId),
        );
  // NOTE: a (key, envScope, NULL) unique index cannot dedupe in MySQL — NULLs
  // are distinct — so duplicates are possible; latest id always wins.
  const [row] = await db
    .select()
    .from(featureFlags)
    .where(scopeFilter)
    .orderBy(desc(featureFlags.id))
    .limit(1);
  if (!row) return null;
  return { enabled: row.enabled, rolloutPercent: row.rolloutPercent, loadedAt: Date.now() };
}

export function invalidateFlagCache(): void {
  cache.clear();
}

export async function isEnabled(
  flag: FeatureFlag,
  opts: { userId?: number; collegeId?: string; db?: DB } = {},
): Promise<boolean> {
  if (!FEATURE_FLAGS.includes(flag)) return false;
  const db = opts.db ?? getDb();
  const collegeId = opts.collegeId ?? null;
  const cacheKey = `${flag}:${collegeId ?? "*"}`;

  let entry = cache.get(cacheKey);
  if (!entry || Date.now() - entry.loadedAt > CACHE_TTL_MS) {
    const envScope = getEnv().NODE_ENV;
    // College-specific row wins; fall back to the environment-wide row.
    entry =
      (collegeId !== null ? await loadRow(db, flag, envScope, collegeId) : null) ??
      (await loadRow(db, flag, envScope, null)) ?? { enabled: true, rolloutPercent: 100, loadedAt: Date.now() };
    cache.set(cacheKey, entry);
  }

  if (!entry.enabled) return false;
  if (entry.rolloutPercent >= 100) return true;
  if (entry.rolloutPercent <= 0) return false;
  return bucket(flag, opts.userId) < entry.rolloutPercent;
}
