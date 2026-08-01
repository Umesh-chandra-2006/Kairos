import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { getDb } from "@kairos/db";
import { answers, notificationOutbox, notificationPrefs, pushSubscriptions } from "@kairos/db/schema";
import { getApp, registerUser, uniqueEmail } from "./helpers";
import { drainOutbox, enqueueDailyReminders } from "../workers/notificationWorker";

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
});
