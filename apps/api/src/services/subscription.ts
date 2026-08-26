import Razorpay from "razorpay";
import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@kairos/db";
import { subscriptions, usageTracking, users } from "@kairos/db/schema";
import { logger } from "../lib/logger.js";

let razorpayInstance: Razorpay | null = null;

function getRazorpay(): Razorpay {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
  }
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
}

export async function getOrCreateCustomer(userId: number, email: string): Promise<string> {
  const db = getDb();
  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });
  if (existing?.paymentCustomerId) return existing.paymentCustomerId;

  const rp = getRazorpay();
  const customer = await rp.customers.create({ name: email, email });

  if (existing) {
    await db.update(subscriptions)
      .set({ paymentCustomerId: customer.id })
      .where(eq(subscriptions.userId, userId));
  } else {
    await db.insert(subscriptions).values({
      userId,
      paymentCustomerId: customer.id,
      plan: "free",
      status: "active",
    });
  }

  logger.info({ userId, customerId: customer.id }, "Razorpay customer created");
  return customer.id;
}

export async function createCheckoutSession(
  userId: number,
  email: string,
): Promise<{ subscriptionId: string; shortUrl: string }> {
  const rp = getRazorpay();
  const planId = process.env.RAZORPAY_PLAN_ID;
  if (!planId) throw new Error("RAZORPAY_PLAN_ID must be set");

  const subscription = await rp.subscriptions.create({
    plan_id: planId,
    total_count: 12,
    customer_notify: 1,
    notes: { userId: String(userId) },
    notify_info: { email },
  } as Parameters<typeof rp.subscriptions.create>[0]);

  const sub = subscription as unknown as {
    id: string;
    short_url?: string;
  };

  const db = getDb();
  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });
  if (existing) {
    await db.update(subscriptions)
      .set({ paymentSubscriptionId: sub.id })
      .where(eq(subscriptions.userId, userId));
  } else {
    await db.insert(subscriptions).values({
      userId,
      paymentSubscriptionId: sub.id,
      plan: "free",
      status: "active",
    });
  }

  logger.info({ userId, subscriptionId: sub.id }, "Razorpay subscription created");
  return {
    subscriptionId: sub.id,
    shortUrl: sub.short_url || "",
  };
}

export async function handleWebhook(event: {
  payload: { subscription: { entity: Record<string, unknown> } };
}): Promise<void> {
  const sub = event.payload.subscription.entity;
  const razorpaySubId = sub.id as string;
  const db = getDb();

  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.paymentSubscriptionId, razorpaySubId),
  });
  if (!existing) {
    logger.warn({ razorpaySubId }, "Webhook for unknown subscription");
    return;
  }

  const razorpayStatus = sub.status as string;
  const plan = razorpayStatus === "active" ? "pro" : "free";
  const status =
    razorpayStatus === "active"
      ? "active"
      : razorpayStatus === "past_due"
        ? "past_due"
        : razorpayStatus === "cancelled"
          ? "canceled"
          : "active";

  const periodStart = sub.current_start
    ? new Date((sub.current_start as number) * 1000)
    : null;
  const periodEnd = sub.current_end
    ? new Date((sub.current_end as number) * 1000)
    : null;
  const cancelAtEnd = (sub.cancel_at_cycle_end as number) === 1;

  await db
    .update(subscriptions)
    .set({
      plan,
      status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: cancelAtEnd,
    })
    .where(eq(subscriptions.id, existing.id));

  logger.info({ userId: existing.userId, plan, status }, "Subscription updated via webhook");
}

export async function cancelSubscription(userId: number): Promise<void> {
  const db = getDb();
  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });
  if (!existing?.paymentSubscriptionId) {
    throw new Error("No active Razorpay subscription to cancel");
  }

  const rp = getRazorpay();
  await rp.subscriptions.cancel(existing.paymentSubscriptionId);

  await db
    .update(subscriptions)
    .set({
      plan: "free",
      status: "canceled",
      cancelAtPeriodEnd: false,
    })
    .where(eq(subscriptions.id, existing.id));

  logger.info({ userId }, "Subscription cancelled");
}

export async function getCurrentSubscription(userId: number) {
  const db = getDb();
  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });
  if (!existing) {
    return { plan: "free", status: "active", currentPeriodEnd: null };
  }
  return {
    plan: existing.plan,
    status: existing.status,
    currentPeriodEnd: existing.currentPeriodEnd,
    cancelAtPeriodEnd: existing.cancelAtPeriodEnd,
  };
}

export async function canPerformEval(
  userId: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const db = getDb();
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });
  if (sub?.plan === "pro") return { allowed: true, remaining: Infinity };

  const today = new Date().toISOString().slice(0, 10);
  const [row] = await db
    .select()
    .from(usageTracking)
    .where(and(eq(usageTracking.userId, userId), eq(usageTracking.date, today)));

  const used = row?.evaluationsUsed ?? 0;
  const limit = row?.evaluationsLimit ?? 3;
  return { allowed: used < limit, remaining: Math.max(0, limit - used) };
}

export async function recordEvaluationUsage(userId: number): Promise<void> {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const existing = await db.query.usageTracking.findFirst({
    where: and(eq(usageTracking.userId, userId), eq(usageTracking.date, today)),
  });

  if (existing) {
    await db
      .update(usageTracking)
      .set({ evaluationsUsed: existing.evaluationsUsed + 1 })
      .where(eq(usageTracking.id, existing.id));
  } else {
    await db.insert(usageTracking).values({
      userId,
      date: today,
      evaluationsUsed: 1,
      evaluationsLimit: 3,
      voiceMinutesUsed: 0,
      voiceMinutesLimit: 10,
    });
  }
}

export async function canPerformVoice(
  userId: number,
  minutesRequested: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const db = getDb();
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });
  if (sub?.plan === "pro") return { allowed: true, remaining: Infinity };

  const today = new Date().toISOString().slice(0, 10);
  const [row] = await db
    .select()
    .from(usageTracking)
    .where(and(eq(usageTracking.userId, userId), eq(usageTracking.date, today)));

  const used = row?.voiceMinutesUsed ?? 0;
  const limit = row?.voiceMinutesLimit ?? 10;
  return {
    allowed: used + minutesRequested <= limit,
    remaining: Math.max(0, limit - used),
  };
}

export async function recordVoiceUsage(userId: number, minutes: number): Promise<void> {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const existing = await db.query.usageTracking.findFirst({
    where: and(eq(usageTracking.userId, userId), eq(usageTracking.date, today)),
  });

  if (existing) {
    await db
      .update(usageTracking)
      .set({ voiceMinutesUsed: existing.voiceMinutesUsed + minutes })
      .where(eq(usageTracking.id, existing.id));
  } else {
    await db.insert(usageTracking).values({
      userId,
      date: today,
      evaluationsUsed: 0,
      evaluationsLimit: 3,
      voiceMinutesUsed: minutes,
      voiceMinutesLimit: 10,
    });
  }
}
