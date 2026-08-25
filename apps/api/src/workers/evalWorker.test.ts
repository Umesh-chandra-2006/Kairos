import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@kairos/db";
import { answers, questions } from "@kairos/db/schema";
import type { AnswerStatusDb } from "@kairos/db/schema";
import { claimAnswerForEval } from "./evalWorker";
import { registerUser, uniqueEmail } from "../test/helpers";

async function insertAnswer(userId: number, questionId: number, status: AnswerStatusDb): Promise<number> {
  const [row] = await getDb()
    .insert(answers)
    .values({
      userId,
      questionId,
      date: "2026-08-25",
      dailyKey: null,
      answerText: "A sufficiently long practice answer for claim-semantics testing.",
      status,
    })
    .execute();
  return row.insertId;
}

async function pickQuestion(): Promise<number> {
  const [q] = await getDb().select({ id: questions.id }).from(questions).limit(1);
  if (!q) throw new Error("no seeded questions");
  return q.id;
}

async function statusOf(answerId: number): Promise<AnswerStatusDb> {
  const [row] = await getDb().select({ status: answers.status }).from(answers).where(eq(answers.id, answerId));
  return row!.status as AnswerStatusDb;
}

afterEach(async () => {
  await getDb().delete(answers).execute().catch(() => undefined);
});

describe("claimAnswerForEval atomic claim semantics", () => {
  it("claims a pending (legacy created) row exactly once", async () => {
    const { user } = await registerUser(uniqueEmail("claim1"));
    const answerId = await insertAnswer(user.id, await pickQuestion(), "pending");

    expect(await claimAnswerForEval(getDb(), answerId)).toBe(true);
    expect(await statusOf(answerId)).toBe("processing");

    // Second caller loses the race — the CAS update affects zero rows.
    expect(await claimAnswerForEval(getDb(), answerId)).toBe(false);
    expect(await statusOf(answerId)).toBe("processing");
  });

  it("never claims terminal or non-queued V2 rows", async () => {
    const { user } = await registerUser(uniqueEmail("claim2"));
    const qid = await pickQuestion();

    for (const status of ["completed", "failed", "cancelled", "created"] as const) {
      const id = await insertAnswer(user.id, qid, status);
      expect(await claimAnswerForEval(getDb(), id), `status=${status}`).toBe(false);
      expect(await statusOf(id)).toBe(status);
    }
  });

  it("claims a queued (V2) row", async () => {
    const { user } = await registerUser(uniqueEmail("claim3"));
    const id = await insertAnswer(user.id, await pickQuestion(), "queued");
    expect(await claimAnswerForEval(getDb(), id)).toBe(true);
    expect(await statusOf(id)).toBe("processing");
  });
});
