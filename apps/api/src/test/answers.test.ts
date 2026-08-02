import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { getDb } from "@kairos/db";
import { answers } from "@kairos/db/schema";
import { eq } from "drizzle-orm";
import { getApp, registerUser, uniqueEmail } from "./helpers";

async function waitForStatus(answerId: number, accessToken: string, timeoutMs = 10_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const res = await request(getApp())
      .get(`/api/answers/${answerId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    const status: string = res.body.answer.status;
    if (status === "completed" || status === "failed") return status;
    if (Date.now() > deadline) return status;
    await new Promise((r) => setTimeout(r, 200));
  }
}

afterEach(async () => {
  // Isolate answer-submit tests: remove any submitted answers so re-runs stay clean.
  await getDb().delete(answers).execute().catch(() => undefined);
});

describe("questions API", () => {
  it("assigns a daily question for a fresh user", async () => {
    const { accessToken } = await registerUser(uniqueEmail("q_today"));
    const res = await request(getApp())
      .get("/api/questions/today")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.question).not.toBeNull();
    expect(res.body.question.category).toBeTypeOf("string");
    expect(res.body.alreadyAnswered).toBe(false);
  });

  it("lists questions with filters", async () => {
    const { accessToken } = await registerUser(uniqueEmail("q_list"));
    const res = await request(getApp())
      .get("/api/questions?limit=5")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(Array.isArray(res.body.questions)).toBe(true);
    expect(res.body.questions.length).toBeGreaterThan(0);
  });

  it("requires auth", async () => {
    await request(getApp()).get("/api/questions/today").expect(401);
  });
});

describe("answers API", () => {
  it("submits an answer and evaluates it (fails gracefully without OpenRouter)", async () => {
    const { accessToken } = await registerUser(uniqueEmail("ans"));
    const today = await request(getApp())
      .get("/api/questions/today")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    const questionId: number = today.body.question.id;

    const submit = await request(getApp())
      .post("/api/answers/submit")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ questionId, answerText: "This is a sufficiently long test answer covering the topic in detail." })
      .expect(201);
    expect(submit.body.answerId).toBeTypeOf("number");

    const status = await waitForStatus(submit.body.answerId, accessToken);
    expect(["completed", "failed"]).toContain(status);
  });

  it("rejects a second answer for the same day", async () => {
    const { accessToken } = await registerUser(uniqueEmail("ans2"));
    const today = await request(getApp())
      .get("/api/questions/today")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    const questionId: number = today.body.question.id;

    await request(getApp())
      .post("/api/answers/submit")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ questionId, answerText: "First answer that is long enough to be accepted by the schema here." })
      .expect(201);

    await request(getApp())
      .post("/api/answers/submit")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ questionId, answerText: "Second answer that is also long enough for the validation." })
      .expect(409);
  });

  it("rejects a too-short answer", async () => {
    const { accessToken } = await registerUser(uniqueEmail("ans3"));
    const today = await request(getApp())
      .get("/api/questions/today")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    const questionId: number = today.body.question.id;
    await request(getApp())
      .post("/api/answers/submit")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ questionId, answerText: "short" })
      .expect(400);
  });

  it("returns history for the user", async () => {
    const { accessToken } = await registerUser(uniqueEmail("hist"));
    const today = await request(getApp())
      .get("/api/questions/today")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    const questionId: number = today.body.question.id;

    await request(getApp())
      .post("/api/answers/submit")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ questionId, answerText: "A history answer that is certainly long enough to pass validation." })
      .expect(201);

    const res = await request(getApp())
      .get("/api/answers?limit=20")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.answers.length).toBeGreaterThanOrEqual(1);
    expect(res.body.answers[0].question.id).toBe(questionId);
  });
});

describe("practice API", () => {
  it("returns a random practice question", async () => {
    const { accessToken } = await registerUser(uniqueEmail("pr_q"));
    const res = await request(getApp())
      .get("/api/questions/practice")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.question).toHaveProperty("text");
    expect(res.body.question).toHaveProperty("category");
  });

  it("filters practice questions by category", async () => {
    const { accessToken } = await registerUser(uniqueEmail("pr_cat"));
    const res = await request(getApp())
      .get("/api/questions/practice?category=DSA")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.question.category).toBe("DSA");
  });

  it("allows a practice answer even after the daily answer, without touching the streak", async () => {
    const { accessToken } = await registerUser(uniqueEmail("pr_sub"));
    const today = await request(getApp())
      .get("/api/questions/today")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    const dailyQuestionId: number = today.body.question.id;

    const daily = await request(getApp())
      .post("/api/answers/submit")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ questionId: dailyQuestionId, answerText: "A sufficiently long daily answer for the evaluation flow." })
      .expect(201);
    await waitForStatus(daily.body.answerId, accessToken);

    const before = await request(getApp())
      .get("/api/streak")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    const streakBefore = before.body.streak.current as number;

    const practice = await request(getApp())
      .get("/api/questions/practice?category=DSA")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    const practiceQuestionId: number = practice.body.question.id;

    const submit = await request(getApp())
      .post("/api/answers/practice")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ questionId: practiceQuestionId, answerText: "A sufficiently long practice answer for the evaluation flow." })
      .expect(201);
    expect(submit.body.answerId).toBeTypeOf("number");

    const status = await waitForStatus(submit.body.answerId, accessToken);
    expect(["completed", "failed"]).toContain(status);

    const detail = await request(getApp())
      .get(`/api/answers/${submit.body.answerId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(detail.body.answer.isPractice).toBe(true);

    const after = await request(getApp())
      .get("/api/streak")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    // Practice answers must never move the streak (even when the daily eval failed).
    expect(after.body.streak.current).toBe(streakBefore);
  });

  it("does not mark the daily question as answered by a practice submission", async () => {
    const { accessToken } = await registerUser(uniqueEmail("pr_daily"));
    const practice = await request(getApp())
      .get("/api/questions/practice")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    await request(getApp())
      .post("/api/answers/practice")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ questionId: practice.body.question.id, answerText: "A practice answer that is long enough to validate." })
      .expect(201);

    const today = await request(getApp())
      .get("/api/questions/today")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(today.body.alreadyAnswered).toBe(false);
    expect(today.body.question).not.toBeNull();
  });
});

describe("deterministic daily question", () => {
  it("gives two users the same question on the same day", async () => {
    const { accessToken: t1 } = await registerUser(uniqueEmail("det_a"));
    const { accessToken: t2 } = await registerUser(uniqueEmail("det_b"));

    const [r1, r2] = await Promise.all([
      request(getApp()).get("/api/questions/today").set("Authorization", `Bearer ${t1}`).expect(200),
      request(getApp()).get("/api/questions/today").set("Authorization", `Bearer ${t2}`).expect(200),
    ]);

    expect(r1.body.question.id).toBe(r2.body.question.id);
  });
});
