import { eq, and, count } from "drizzle-orm";
import { getDb } from "@kairos/db";
import { referralCodes, referralEvents, subscriptions, users } from "@kairos/db/schema";
import { logger } from "../lib/logger.js";
import crypto from "crypto";

const CODE_LENGTH = 8;
const REFERRER_REWARD_DAYS = 7;
const REFERRED_REWARD_DAYS = 3;
const MAX_USES = 10;

function generateCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Grant Pro days to a user by extending their currentPeriodEnd.
 * If they have no subscription row, create one with a future end date.
 */
async function grantProDays(userId: number, days: number): Promise<void> {
  const db = getDb();
  const now = new Date();
  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  if (existing) {
    const base = existing.currentPeriodEnd && existing.currentPeriodEnd > now
      ? existing.currentPeriodEnd
      : now;
    await db
      .update(subscriptions)
      .set({
        plan: "pro",
        status: "active",
        currentPeriodEnd: addDays(base, days),
      })
      .where(eq(subscriptions.id, existing.id));
  } else {
    await db.insert(subscriptions).values({
      userId,
      plan: "pro",
      status: "active",
      currentPeriodEnd: addDays(now, days),
    });
  }

  logger.info({ userId, days }, "referral pro days granted");
}

export async function getOrCreateReferralCode(userId: number): Promise<string> {
  const db = getDb();
  const existing = await db.query.referralCodes.findFirst({
    where: eq(referralCodes.userId, userId),
  });
  if (existing) return existing.code;

  let code = generateCode();
  let attempts = 0;
  while (attempts < 5) {
    try {
      await db.insert(referralCodes).values({ userId, code, maxUses: MAX_USES });
      return code;
    } catch {
      code = generateCode();
      attempts++;
    }
  }
  throw new Error("Failed to generate unique referral code");
}

export async function applyReferralCode(
  referredUserId: number,
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();

  const referralRow = await db.query.referralCodes.findFirst({
    where: eq(referralCodes.code, code.toUpperCase()),
  });
  if (!referralRow) return { ok: false, error: "Invalid referral code" };
  if (referralRow.userId === referredUserId) return { ok: false, error: "You cannot use your own code" };
  if (referralRow.useCount >= referralRow.maxUses) return { ok: false, error: "Referral code has reached its usage limit" };

  const alreadyReferred = await db.query.referralEvents.findFirst({
    where: eq(referralEvents.referredUserId, referredUserId),
  });
  if (alreadyReferred) return { ok: false, error: "You have already been referred" };

  await db.insert(referralEvents).values({
    referrerUserId: referralRow.userId,
    referredUserId,
    referralCode: code.toUpperCase(),
    referrerRewardDays: REFERRER_REWARD_DAYS,
    referredRewardDays: REFERRED_REWARD_DAYS,
  });

  await db.update(referralCodes)
    .set({ useCount: referralRow.useCount + 1 })
    .where(eq(referralCodes.id, referralRow.id));

  // Grant actual Pro days to both parties
  await grantProDays(referredUserId, REFERRED_REWARD_DAYS);
  await grantProDays(referralRow.userId, REFERRER_REWARD_DAYS);

  logger.info({ referrerUserId: referralRow.userId, referredUserId, code }, "referral applied");
  return { ok: true };
}

export async function getReferralStats(userId: number) {
  const db = getDb();
  const code = await getOrCreateReferralCode(userId);

  const [totalReferred] = await db
    .select({ value: count() })
    .from(referralEvents)
    .where(eq(referralEvents.referrerUserId, userId));

  return {
    code,
    totalReferred: totalReferred?.value ?? 0,
    rewardDays: REFERRER_REWARD_DAYS,
    maxUses: MAX_USES,
    inviteUrl: `https://kairos.app/invite/${code}`,
  };
}
