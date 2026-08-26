import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@kairos/db";
import { featureFlags } from "@kairos/db/schema";
import { invalidateFlagCache, isEnabled } from "./flags.service";

async function setFlag(
  key: "voice_v2",
  opts: { envScope?: "development" | "test" | "production"; collegeId?: string; enabled: boolean; rolloutPercent?: number },
) {
  const { envScope = "test", collegeId = null, enabled, rolloutPercent = 100 } = opts;
  await getDb()
    .insert(featureFlags)
    .values({ key, envScope, collegeId, enabled, rolloutPercent })
    .onDuplicateKeyUpdate({ set: { enabled, rolloutPercent } });
}

async function clearFlags() {
  await getDb().delete(featureFlags).execute();
}

beforeEach(async () => {
  await clearFlags();
  invalidateFlagCache();
});

afterEach(async () => {
  await clearFlags();
  invalidateFlagCache();
});

describe("feature flags", () => {
  it("defaults to enabled when no rows exist", async () => {
    expect(await isEnabled("voice_v2")).toBe(true);
    // Unknown keys are always disabled (runtime guard).
    expect(await isEnabled("nonexistent" as never)).toBe(false);
  });

  it("honors an environment-wide row", async () => {
    await setFlag("voice_v2", { enabled: true });
    invalidateFlagCache();
    expect(await isEnabled("voice_v2")).toBe(true);
  });

  it("envScope isolates environments", async () => {
    // Explicitly disable for test to verify production row doesn't leak in
    await setFlag("voice_v2", { envScope: "test", enabled: false });
    await setFlag("voice_v2", { envScope: "production", enabled: true });
    invalidateFlagCache();
    // Tests run under NODE_ENV=test; a production-only row must not apply.
    expect(await isEnabled("voice_v2")).toBe(false);
  });

  it("college-specific row overrides the environment-wide row", async () => {
    await setFlag("voice_v2", { enabled: true });
    await setFlag("voice_v2", { collegeId: "rvce", enabled: false });
    invalidateFlagCache();
    expect(await isEnabled("voice_v2", { collegeId: "rvce" })).toBe(false);
    expect(await isEnabled("voice_v2", { collegeId: "bmsce" })).toBe(true);
    expect(await isEnabled("voice_v2")).toBe(true);
  });

  it("rolloutPercent gates deterministically", async () => {
    await setFlag("voice_v2", { enabled: true, rolloutPercent: 0 });
    invalidateFlagCache();
    expect(await isEnabled("voice_v2", { userId: 1 })).toBe(false);

    await setFlag("voice_v2", { enabled: true, rolloutPercent: 100 });
    invalidateFlagCache();
    expect(await isEnabled("voice_v2", { userId: 1 })).toBe(true);
  });

  it("same user gets the same bucket decision across checks", async () => {
    await setFlag("voice_v2", { enabled: true, rolloutPercent: 50 });
    invalidateFlagCache();
    const a = await isEnabled("voice_v2", { userId: 4242 });
    const b = await isEnabled("voice_v2", { userId: 4242 });
    expect(a).toBe(b);
  });

  it("cache serves repeat checks without re-querying changed rows until invalidated", async () => {
    await setFlag("voice_v2", { enabled: false });
    invalidateFlagCache();
    expect(await isEnabled("voice_v2")).toBe(false);

    // Change the row behind the cache; the cached value persists.
    await getDb().update(featureFlags).set({ enabled: true }).where(and(eq(featureFlags.key, "voice_v2"), isNull(featureFlags.collegeId)));
    expect(await isEnabled("voice_v2")).toBe(false);

    invalidateFlagCache();
    expect(await isEnabled("voice_v2")).toBe(true);
  });
});
