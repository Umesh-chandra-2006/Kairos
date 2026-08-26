import { eq, and, count } from "drizzle-orm";
import { getDb } from "@kairos/db";
import { referralCodes, referralEvents, users } from "@kairos/db/schema";
import { logger } from "../lib/logger.js";
import crypto from "crypto";

const CODE_LENGTH = 8;
const REFERRER_REWARD_DAYS = 7;
const REFERRED_REWARD_DAYS = 3;
const MAX_USES = 10;

function generateCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
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
