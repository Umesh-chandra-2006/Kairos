import { eq, and } from "drizzle-orm";
import { getDb } from "@kairos/db";
import { subscriptions, usageTracking } from "@kairos/db/schema";
import { getEnv } from "@kairos/config";

// --- Plan Limits ---
export const PLAN_LIMITS: Record<string, { evalsPerDay: number; voiceMinutesPerDay: number }> = {
  free: { evalsPerDay: 3, voiceMinutesPerDay: 10 },
  pro: { evalsPerDay: 999, voiceMinutesPerDay: 999 },
  team: { evalsPerDay: 999, voiceMinutesPerDay: 999 },
};

const today = () => new Date().toISOString().slice(0, 10);

// --- Subscription helpers ---

export async function getSubscription(userId: number) {
  const db = getDb();
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return sub ?? null;
}

export async function ensureFreeSubscription(userId: number) {
  const existing = await getSubscription(userId);
  if (existing) return existing;
  const db = getDb();
  const [created] = await db
    .insert(subscriptions)
    .values({ userId, plan: "free", status: "active" })
    .execute();
  return { id: created.insertId, userId, plan: "free", status: "active" };
}

export async function upgradeToPro(userId: number, stripeCustomerId: string, stripeSubscriptionId: string) {
  const db = getDb();
  const existing = await getSubscription(userId);
  if (existing) {
    await db
      .update(subscriptions)
      .set({
        plan: "pro",
        status: "active",
        stripeCustomerId,
        stripeSubscriptionId,
      })
      .where(eq(subscriptions.userId, userId));
  } else {
    await db.insert(subscriptions).values({
      userId,
      plan: "pro",
      status: "active",
      stripeCustomerId,
      stripeSubscriptionId,
    });
  }
}

export async function cancelSubscription(userId: number) {
  const db = getDb();
  await db
    .update(subscriptions)
    .set({ plan: "free", status: "active", stripeCustomerId: null, stripeSubscriptionId: null })
    .where(eq(subscriptions.userId, userId));
}

// --- Usage tracking ---

export async function getUsage(userId: number, date?: string) {
  const db = getDb();
  const d = date ?? today();
  const [usage] = await db
    .select()
    .from(usageTracking)
    .where(and(eq(usageTracking.userId, userId), eq(usageTracking.date, d)))
    .limit(1);

  if (!usage) {
    const sub = await getSubscription(userId);
    const plan = sub?.plan ?? "free";
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
    return {
      evaluationsUsed: 0,
      evaluationsLimit: limits!.evalsPerDay,
      voiceMinutesUsed: 0,
      voiceMinutesLimit: limits!.voiceMinutesPerDay,
    };
  }

  return {
    evaluationsUsed: usage.evaluationsUsed,
    evaluationsLimit: usage.evaluationsLimit,
    voiceMinutesUsed: usage.voiceMinutesUsed,
    voiceMinutesLimit: usage.voiceMinutesLimit,
  };
}

export async function incrementUsage(userId: number, type: "eval" | "voice_minute", amount = 1) {
  const db = getDb();
  const d = today();
  const sub = await getSubscription(userId);
  const plan = sub?.plan ?? "free";
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  const [existing] = await db
    .select()
    .from(usageTracking)
    .where(and(eq(usageTracking.userId, userId), eq(usageTracking.date, d)))
    .limit(1);

  if (existing) {
    const update: Record<string, number> = {};
    if (type === "eval") {
      update.evaluationsUsed = existing.evaluationsUsed + amount;
    } else {
      update.voiceMinutesUsed = existing.voiceMinutesUsed + amount;
    }
    await db
      .update(usageTracking)
      .set(update)
      .where(eq(usageTracking.id, existing.id));
  } else {
    await db.insert(usageTracking).values({
      userId,
      date: d,
      evaluationsUsed: type === "eval" ? amount : 0,
      evaluationsLimit: limits!.evalsPerDay,
      voiceMinutesUsed: type === "voice_minute" ? amount : 0,
      voiceMinutesLimit: limits!.voiceMinutesPerDay,
    });
  }
}

export async function canPerformEval(userId: number): Promise<{ allowed: boolean; remaining: number }> {
  const usage = await getUsage(userId);
  const remaining = usage.evaluationsLimit - usage.evaluationsUsed;
  return { allowed: remaining > 0, remaining: Math.max(0, remaining) };
}

export async function canUseVoice(userId: number, minutesNeeded = 1): Promise<{ allowed: boolean; remaining: number }> {
  const usage = await getUsage(userId);
  const remaining = usage.voiceMinutesLimit - usage.voiceMinutesUsed;
  return { allowed: remaining >= minutesNeeded, remaining: Math.max(0, remaining) };
}

// --- Stripe session creation (called from routes) ---

export async function createCheckoutSession(userId: number, email: string) {
  const env = getEnv();
  const stripeKey = (env as unknown as Record<string, string>).STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("Stripe not configured");

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" as never });

  const sub = await getSubscription(userId);
  let customerId = sub?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({ email, metadata: { userId: String(userId) } });
    customerId = customer.id;
    await dbUpdateStripeCustomer(userId, customerId);
  }

  const env2 = getEnv() as unknown as Record<string, string>;
  const priceId = env2.STRIPE_PRO_PRICE_ID ?? "price_pro_monthly";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env2.APP_URL ?? "http://localhost:5173"}/settings?billing=success`,
    cancel_url: `${env2.APP_URL ?? "http://localhost:5173"}/settings?billing=cancel`,
    metadata: { userId: String(userId) },
  });

  return { url: session.url };
}

export async function createBillingPortalSession(userId: number) {
  const env = getEnv();
  const stripeKey = (env as unknown as Record<string, string>).STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("Stripe not configured");

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" as never });

  const sub = await getSubscription(userId);
  if (!sub?.stripeCustomerId) throw new Error("No active subscription");

  const env2 = getEnv() as unknown as Record<string, string>;
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${env2.APP_URL ?? "http://localhost:5173"}/settings`,
  });

  return { url: session.url };
}

async function dbUpdateStripeCustomer(userId: number, stripeCustomerId: string) {
  const db = getDb();
  await db
    .update(subscriptions)
    .set({ stripeCustomerId })
    .where(eq(subscriptions.userId, userId));
}

// --- Webhook handler ---

export async function handleStripeWebhook(event: { type: string; data: { object: Record<string, unknown> } }) {
  const db = getDb();
  const obj = event.data.object;

  switch (event.type) {
    case "checkout.session.completed": {
      const userId = Number(obj.metadata && typeof obj.metadata === "object" ? (obj.metadata as Record<string, string>).userId : 0);
      const subscriptionId = typeof obj.subscription === "string" ? obj.subscription : null;
      const customerId = typeof obj.customer === "string" ? obj.customer : null;
      if (userId && subscriptionId && customerId) {
        await upgradeToPro(userId, customerId, subscriptionId);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const stripeSubId = typeof obj.id === "string" ? obj.id : null;
      const status = typeof obj.status === "string" ? obj.status : "active";
      if (stripeSubId) {
        const [sub] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubscriptionId, stripeSubId))
          .limit(1);
        if (sub) {
          const isCanceled = event.type === "customer.subscription.deleted" || status === "canceled";
          await db
            .update(subscriptions)
            .set({
              status: isCanceled ? "canceled" : status,
              plan: isCanceled ? "free" : sub.plan,
              ...(isCanceled ? { stripeCustomerId: null, stripeSubscriptionId: null } : {}),
            })
            .where(eq(subscriptions.id, sub.id));
        }
      }
      break;
    }
  }
}
