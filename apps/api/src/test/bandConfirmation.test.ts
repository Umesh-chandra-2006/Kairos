import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { getDb } from "@kairos/db";
import { answers, questions } from "@kairos/db/schema";
import { getApp, registerUser, uniqueEmail } from "./helpers";

let accessToken: string;
let userId: number;

afterEach(async () => {
  await getDb().delete(answers).execute().catch(() => undefined);
});

describe("band confirmation (labeling queue)", () => {
  it("requires auth", async () => {
    await request(getApp())
      .post("/api/answers/1/confirm")
      .send({ confirmed: true })
      .expect(401);
  });

  it("returns 404 for non-existent answer", async () => {
    const auth = await registerUser(uniqueEmail("bc"));
    accessToken = auth.accessToken;
    userId = auth.user.id;

    await request(getApp())
      .post("/api/answers/99999/confirm")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ confirmed: true })
      .expect(404);
  });

  it("rejects confirmation for non-completed answer", async () => {
    const auth = await registerUser(uniqueEmail("bc"));
    accessToken = auth.accessToken;

    const [question] = await getDb()
      .select({ id: questions.id })
      .from(questions)
      .limit(1);

    // Insert a pending answer
    const [answer] = await getDb()
      .insert(answers)
      .values({
        userId: auth.user.id,
        questionId: question!.id,
        date: "2026-01-01",
        answerText: "test answer",
        status: "pending",
      })
      .execute();

    await request(getApp())
      .post(`/api/answers/${answer.insertId}/confirm`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ confirmed: true })
      .expect(409); // conflict
  });

  it("confirms a completed answer", async () => {
    const auth = await registerUser(uniqueEmail("bc"));
    accessToken = auth.accessToken;

    const [question] = await getDb()
      .select({ id: questions.id })
      .from(questions)
      .limit(1);

    const [answer] = await getDb()
      .insert(answers)
      .values({
        userId: auth.user.id,
        questionId: question!.id,
        date: "2026-01-01",
        answerText: "test answer",
        status: "completed",
        score: 7,
      })
      .execute();

    const res = await request(getApp())
      .post(`/api/answers/${answer.insertId}/confirm`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ confirmed: true, comment: "Fair assessment" })
      .expect(200);

    expect(res.body.confirmation.answerId).toBe(Number(answer.insertId));
    expect(res.body.confirmation.confirmed).toBe(true);
    expect(res.body.confirmation.comment).toBe("Fair assessment");
  });

  it("upserts: second confirmation updates the first", async () => {
    const auth = await registerUser(uniqueEmail("bc"));
    accessToken = auth.accessToken;

    const [question] = await getDb()
      .select({ id: questions.id })
      .from(questions)
      .limit(1);

    const [answer] = await getDb()
      .insert(answers)
      .values({
        userId: auth.user.id,
        questionId: question!.id,
        date: "2026-01-01",
        answerText: "test answer",
        status: "completed",
        score: 7,
      })
      .execute();

    await request(getApp())
      .post(`/api/answers/${answer.insertId}/confirm`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ confirmed: true })
      .expect(200);

    const res2 = await request(getApp())
      .post(`/api/answers/${answer.insertId}/confirm`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ confirmed: false, comment: "Too harsh" })
      .expect(200);

    expect(res2.body.confirmation.confirmed).toBe(false);
    expect(res2.body.confirmation.comment).toBe("Too harsh");
  });

  it("GET confirmation returns existing confirmation", async () => {
    const auth = await registerUser(uniqueEmail("bc"));
    accessToken = auth.accessToken;

    const [question] = await getDb()
      .select({ id: questions.id })
      .from(questions)
      .limit(1);

    const [answer] = await getDb()
      .insert(answers)
      .values({
        userId: auth.user.id,
        questionId: question!.id,
        date: "2026-01-01",
        answerText: "test answer",
        status: "completed",
        score: 7,
      })
      .execute();

    await request(getApp())
      .post(`/api/answers/${answer.insertId}/confirm`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ confirmed: true })
      .expect(200);

    const res = await request(getApp())
      .get(`/api/answers/${answer.insertId}/confirmation`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.confirmation).not.toBeNull();
    expect(res.body.confirmation.confirmed).toBe(true);
  });

  it("prevents cross-user confirmation of another user's answer", async () => {
    const auth1 = await registerUser(uniqueEmail("bc"));
    const auth2 = await registerUser(uniqueEmail("bc"));

    const [question] = await getDb()
      .select({ id: questions.id })
      .from(questions)
      .limit(1);

    const [answer] = await getDb()
      .insert(answers)
      .values({
        userId: auth1.user.id,
        questionId: question!.id,
        date: "2026-01-01",
        answerText: "test answer",
        status: "completed",
        score: 7,
      })
      .execute();

    // User 2 tries to confirm user 1's answer — should get 404 (answer not found for this user)
    await request(getApp())
      .post(`/api/answers/${answer.insertId}/confirm`)
      .set("Authorization", `Bearer ${auth2.accessToken}`)
      .send({ confirmed: true })
      .expect(404);
  });
});
