import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { getDb } from "@kairos/db";
import { answers, notificationOutbox, notificationPrefs, pushSubscriptions, questions } from "@kairos/db/schema";
import { getApp, registerUser, uniqueEmail } from "./helpers";
import { drainOutbox, enqueueDailyReminders, enqueueWeeklySummaries } from "../workers/notificationWorker";
import { addDaysStr, lastMondayStr } from "../lib/dates";

afterEach(async () => {
  const db = getDb();
  await db.delete(notificationOutbox);
  await db.delete(pushSubscriptions);
  await db.delete(notificationPrefs);
  await db.delete(answers);
});

/** A deterministic instant today at 09:30 UTC so reminder matching is stable. */
function reminderNow(): Date {
  const d = new Date();
  d.setUTCHours(9, 30, 0, 0);
  return d;
}

async function eligibleUser(email: string) {
  const { accessToken, user } = await registerUser(email);

  await request(getApp())
    .put("/api/auth/me/onboarding")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      role: "student",
      level: "beginner",
      targets: ["Google"],
      notificationTime: "09:30",
      timezone: "UTC",
    })
    .expect(200);

  await request(getApp())
    .put("/api/notifications/prefs")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ streakReminder: true, pushEnabled: true, reminderTime: "09:30" })
    .expect(200);

  return { accessToken, user };
}

describe("notification scheduler", () => {
  it("enqueues a daily reminder once for an eligible user", async () => {
    const { accessToken } = await eligibleUser(uniqueEmail("n_rem"));

    await request(getApp())
      .post("/api/notifications/push-subscriptions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ channel: "expo", token: `ExponentPushToken[test_${Date.now()}]` })
      .expect(201);

    const db = getDb();
    expect(await enqueueDailyReminders(db, reminderNow())).toBe(1);
    expect(await enqueueDailyReminders(db, reminderNow())).toBe(0); // idempotent

    const rows = await db.select().from(notificationOutbox);
    expect(rows.filter((r) => r.type === "streak_reminder").length).toBe(1);
  });

  it("does not enqueue when the user already answered today", async () => {
    const { accessToken, user } = await eligibleUser(uniqueEmail("n_done"));
    const db = getDb();

    await request(getApp())
      .post("/api/notifications/push-subscriptions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ channel: "web", token: "https://example.com/push", keys: { p256dh: "x", auth: "y" } })
      .expect(201);

    await db.insert(answers).values({
      userId: user.id,
      questionId: 1,
      date: new Date().toISOString().slice(0, 10),
      answerText: "A test answer that is long enough to pass validation.",
      status: "completed",
    });

    expect(await enqueueDailyReminders(db, reminderNow())).toBe(0);
  });

  it("drains the outbox and marks entries sent", async () => {
    const { accessToken } = await eligibleUser(uniqueEmail("n_drain"));

    await request(getApp())
      .post("/api/notifications/push-subscriptions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ channel: "web", token: "https://example.com/push", keys: { p256dh: "x", auth: "y" } })
      .expect(201);

    const db = getDb();
    expect(await enqueueDailyReminders(db, reminderNow())).toBe(1);
    expect(await drainOutbox(db)).toBe(1);

    const rows = await db.select().from(notificationOutbox);
    expect(rows.length).toBe(1);
    expect(rows[0]!.status).toBe("sent");
  });

  it("requires auth for prefs and subscriptions", async () => {
    await request(getApp()).get("/api/notifications/prefs").expect(401);
    await request(getApp()).post("/api/notifications/push-subscriptions").send({ channel: "expo", token: "t" }).expect(401);
  });

  it("exposes the VAPID public key (or null when unconfigured)", async () => {
    const { accessToken } = await registerUser(uniqueEmail("n_vapid"));
    const res = await request(getApp())
      .get("/api/notifications/vapid-public-key")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect("publicKey" in res.body).toBe(true);
    expect(res.body.publicKey === null || typeof res.body.publicKey === "string").toBe(true);
  });

  it("lists the user's push subscriptions", async () => {
    const { accessToken } = await registerUser(uniqueEmail("n_list"));

    const empty = await request(getApp())
      .get("/api/notifications/subscriptions")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(empty.body.subscriptions).toEqual([]);

    await request(getApp())
      .post("/api/notifications/push-subscriptions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ channel: "web", token: "https://example.com/push-list", keys: { p256dh: "x", auth: "y" } })
      .expect(201);

    const res = await request(getApp())
      .get("/api/notifications/subscriptions")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.subscriptions).toHaveLength(1);
    expect(res.body.subscriptions[0]).toMatchObject({
      channel: "web",
      token: "https://example.com/push-list",
    });
  });
});

/** A deterministic Monday 09:30 UTC (rolls back to the current week's Monday). */
function mondayNow(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  d.setUTCHours(9, 30, 0, 0);
  return d;
}

/** Two questions from distinct categories in the seeded test bank. */
async function distinctQuestions() {
  const db = getDb();
  const all = await db.select({ id: questions.id, category: questions.category }).from(questions);
  const a = all[0]!;
  const b = all.find((q) => q.category !== a.category)!;
  return { a, b };
}

async function insertDailyAnswer(
  userId: number,
  questionId: number,
  date: string,
  score: number,
  answerText = "A weekly summary test answer that is long enough.",
) {
  await getDb().insert(answers).values({
    userId,
    questionId,
    date,
    dailyKey: date,
    answerText,
    score,
    status: "completed",
  });
}

describe("weekly summary", () => {
  it("does not run outside Monday", async () => {
    const { user } = await registerUser(uniqueEmail("ws_wed"));
    const { a } = await distinctQuestions();
    await insertDailyAnswer(user.id, a.id, addDaysStr(lastMondayStr(mondayNow()), -2), 7);
    const wednesday = new Date(mondayNow().getTime() + 2 * 86_400_000);
    expect(await enqueueWeeklySummaries(getDb(), wednesday)).toBe(0);
  });

  it("enqueues a summary with answered count, average score, and weakest category", async () => {
    const { user } = await registerUser(uniqueEmail("ws_agg"));
    const { a, b } = await distinctQuestions();
    const weekEnd = lastMondayStr(mondayNow());
    const dayA = addDaysStr(weekEnd, -5); // category A, one answer score 3
    const dayB1 = addDaysStr(weekEnd, -2); // category B, two answers score 8
    const dayB2 = addDaysStr(weekEnd, -1);

    await insertDailyAnswer(user.id, a.id, dayA, 3);
    await insertDailyAnswer(user.id, b.id, dayB1, 8);
    await insertDailyAnswer(user.id, b.id, dayB2, 8);

    const db = getDb();
    expect(await enqueueWeeklySummaries(db, mondayNow())).toBe(1);
    expect(await enqueueWeeklySummaries(db, mondayNow())).toBe(0); // idempotent

    const [row] = await db.select().from(notificationOutbox).where(eq(notificationOutbox.type, "weekly_summary"));
    expect(row).toBeDefined();
    expect(row!.channel).toBe("email");
    const payload = row!.payload as { weekStart: string; stats: { answered: number; avgScore: number; weakestCategory: string } };
    expect(payload.weekStart).toBe(addDaysStr(weekEnd, -7));
    expect(payload.stats.answered).toBe(3);
    expect(payload.stats.avgScore).toBe(6.3);
    expect(payload.stats.weakestCategory).toBe(a.category);
  });

  it("ignores practice answers (null dailyKey) and answers outside the window", async () => {
    const { user } = await registerUser(uniqueEmail("ws_prac"));
    const { a, b } = await distinctQuestions();
    const weekEnd = lastMondayStr(mondayNow());

    await getDb().insert(answers).values({
      userId: user.id,
      questionId: a.id,
      date: addDaysStr(weekEnd, -3),
      dailyKey: null, // practice
      answerText: "A practice answer that is long enough.",
      score: 9,
      status: "completed",
    });
    await insertDailyAnswer(user.id, b.id, weekEnd, 7); // this Monday -> next week

    expect(await enqueueWeeklySummaries(getDb(), mondayNow())).toBe(0);
  });

  it("skips users with no answers last week", async () => {
    const { user } = await registerUser(uniqueEmail("ws_none"));
    void user;
    expect(await enqueueWeeklySummaries(getDb(), mondayNow())).toBe(0);
  });

  it("drains a summary email entry (retries without an email provider)", async () => {
    const { user } = await registerUser(uniqueEmail("ws_drain"));
    const { a } = await distinctQuestions();
    await insertDailyAnswer(user.id, a.id, addDaysStr(lastMondayStr(mondayNow()), -3), 6);

    const db = getDb();
    expect(await enqueueWeeklySummaries(db, mondayNow())).toBe(1);
    expect(await drainOutbox(db)).toBe(0); // email dry-run fails -> nothing sent

    const [row] = await db.select().from(notificationOutbox).where(eq(notificationOutbox.type, "weekly_summary"));
    expect(row!.status).toBe("pending"); // scheduled for retry
    expect(row!.attempts).toBe(1);
  });
});
