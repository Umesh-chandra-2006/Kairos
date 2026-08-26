import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { getDb } from "@kairos/db";
import { answers, questions, users } from "@kairos/db/schema";
import { getApp, registerUser, uniqueEmail } from "./helpers";

let tpoAccessToken: string;
let tpoUserId: number;
let studentAccessToken: string;
let studentUserId: number;

afterEach(async () => {
  const db = getDb();
  await db.delete(answers).execute().catch(() => undefined);
});

async function setupTpoEnvironment() {
  const tpo = await registerUser(uniqueEmail("tpoD"));
  const student = await registerUser(uniqueEmail("studD"));
  const db = getDb();

  await db
    .update(users)
    .set({ role: "tpo", collegeId: "test_college" })
    .where(eq(users.id, tpo.user.id));
  await db
    .update(users)
    .set({ collegeId: "test_college" })
    .where(eq(users.id, student.user.id));

  tpoAccessToken = tpo.accessToken;
  tpoUserId = tpo.user.id;
  studentAccessToken = student.accessToken;
  studentUserId = student.user.id;
}

async function insertCompletedAnswer(userId: number, score = 7) {
  const db = getDb();
  const [question] = await db
    .select({ id: questions.id })
    .from(questions)
    .limit(1);
  return db
    .insert(answers)
    .values({
      userId,
      questionId: question!.id,
      date: "2026-01-01",
      answerText: "Test answer for TPO dashboard",
      status: "completed",
      score,
    })
    .execute();
}

describe("TPO dashboard endpoints", () => {
  it("activation returns students for TPO's college", async () => {
    await setupTpoEnvironment();
    await insertCompletedAnswer(studentUserId);

    const res = await request(getApp())
      .get("/api/tpo/activation")
      .set("Authorization", `Bearer ${tpoAccessToken}`)
      .expect(200);

    expect(res.body.students).toBeDefined();
    expect(Array.isArray(res.body.students)).toBe(true);
  });

  it("activation rejects non-TPO role", async () => {
    await setupTpoEnvironment();

    await request(getApp())
      .get("/api/tpo/activation")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .expect(403);
  });

  it("activation rejects unauthenticated request", async () => {
    await request(getApp())
      .get("/api/tpo/activation")
      .expect(401);
  });

  it("improvement returns students with trend data", async () => {
    await setupTpoEnvironment();
    await insertCompletedAnswer(studentUserId, 8);

    const res = await request(getApp())
      .get("/api/tpo/improvement")
      .set("Authorization", `Bearer ${tpoAccessToken}`)
      .expect(200);

    expect(res.body.students).toBeDefined();
    expect(Array.isArray(res.body.students)).toBe(true);
  });

  it("weak-skills returns skills data", async () => {
    await setupTpoEnvironment();
    await insertCompletedAnswer(studentUserId);

    const res = await request(getApp())
      .get("/api/tpo/weak-skills")
      .set("Authorization", `Bearer ${tpoAccessToken}`)
      .expect(200);

    expect(res.body.skills).toBeDefined();
    expect(Array.isArray(res.body.skills)).toBe(true);
  });

  it("intervention returns students (does not 500)", async () => {
    await setupTpoEnvironment();

    const res = await request(getApp())
      .get("/api/tpo/intervention")
      .set("Authorization", `Bearer ${tpoAccessToken}`)
      .expect(200);

    expect(res.body.students).toBeDefined();
    expect(Array.isArray(res.body.students)).toBe(true);
  });

  it("readiness-trend returns weekly data", async () => {
    await setupTpoEnvironment();
    await insertCompletedAnswer(studentUserId);

    const res = await request(getApp())
      .get("/api/tpo/readiness-trend")
      .set("Authorization", `Bearer ${tpoAccessToken}`)
      .expect(200);

    expect(res.body.weeks).toBeDefined();
    expect(Array.isArray(res.body.weeks)).toBe(true);
  });

  it("calibration-stats returns confirmation stats", async () => {
    await setupTpoEnvironment();

    const res = await request(getApp())
      .get("/api/tpo/calibration-stats")
      .set("Authorization", `Bearer ${tpoAccessToken}`)
      .expect(200);

    expect(res.body.stats).toBeDefined();
    expect(Array.isArray(res.body.stats)).toBe(true);
  });

  it("cross-college TPO cannot see other college data", async () => {
    const tpoA = await registerUser(uniqueEmail("tpoX"));
    const tpoB = await registerUser(uniqueEmail("tpoY"));
    const studentB = await registerUser(uniqueEmail("studX"));
    const db = getDb();

    await db.update(users).set({ role: "tpo", collegeId: "college_a" }).where(eq(users.id, tpoA.user.id));
    await db.update(users).set({ role: "tpo", collegeId: "college_b" }).where(eq(users.id, tpoB.user.id));
    await db.update(users).set({ collegeId: "college_b" }).where(eq(users.id, studentB.user.id));

    await insertCompletedAnswer(studentB.user.id);

    const res = await request(getApp())
      .get("/api/tpo/activation")
      .set("Authorization", `Bearer ${tpoA.accessToken}`)
      .expect(200);

    const studentIds = (res.body.students as { userId: number }[]).map(
      (s) => s.userId,
    );
    expect(studentIds).not.toContain(studentB.user.id);
  });

  it("audit log created for TPO queries", async () => {
    await setupTpoEnvironment();

    await request(getApp())
      .get("/api/tpo/activation")
      .set("Authorization", `Bearer ${tpoAccessToken}`)
      .expect(200);

    const db = getDb();
    const { tpoViews } = await import("@kairos/db/schema");
    const [row] = await db
      .select()
      .from(tpoViews)
      .where(eq(tpoViews.userId, tpoUserId))
      .limit(1);

    expect(row).toBeDefined();
    expect(row!.collegeId).toBe("test_college");
    expect(row!.queryType).toBe("activation");
  });
});
