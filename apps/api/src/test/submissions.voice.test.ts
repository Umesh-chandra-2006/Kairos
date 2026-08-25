import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { getDb } from "@kairos/db";
import { answers, evaluationVersions, questions } from "@kairos/db/schema";
import type { EvaluationResult } from "@kairos/shared";
import { getApp, registerUser, uniqueEmail } from "./helpers";

async function waitForVoiceStatus(submissionId: number, accessToken: string, timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const res = await request(getApp())
      .get(`/api/submissions/${submissionId}/evaluation`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    const status: string = res.body.status;
    if (status === "completed" || status === "failed") return status;
    if (Date.now() > deadline) return status;
    await new Promise((r) => setTimeout(r, 200));
  }
}

afterEach(async () => {
  await getDb().delete(answers).execute().catch(() => undefined);
});

describe("voice submission pipeline (mock ASR + mock model)", () => {
  it("requires auth", async () => {
    await request(getApp())
      .post("/api/submissions/voice?questionId=1&idempotencyKey=abcdef123456")
      .set("Content-Type", "audio/webm")
      .send(Buffer.from("fake"))
      .expect(401);
  });

  it("runs upload → transcribe → evaluate → completed with a persisted contract", async () => {
    const { accessToken, user } = await registerUser(uniqueEmail("voice"));
    const [question] = await getDb().select({ id: questions.id }).from(questions).limit(1);

    // ~60s of "speech": MockASR spreads words evenly across the duration.
    const audio = Buffer.alloc(64_000, 7);
    const submit = await request(getApp())
      .post(`/api/submissions/voice?questionId=${question!.id}&idempotencyKey=voice-e2e-0001`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Content-Type", "audio/webm")
      .send(audio)
      .expect(202);
    expect(submit.body.submissionId).toBeTypeOf("number");
    expect(["queued", "processing"]).toContain(submit.body.status);

    const status = await waitForVoiceStatus(submit.body.submissionId, accessToken);
    expect(status).toBe("completed");

    const res = await request(getApp())
      .get(`/api/submissions/${submit.body.submissionId}/evaluation`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.transcript.length).toBeGreaterThan(0);

    const evaluation = res.body.evaluation as EvaluationResult | null;
    expect(evaluation).not.toBeNull();
    expect(evaluation!.contractVersion).toBe(1);
    expect(evaluation!.answerId).toBe(submit.body.submissionId);
    expect(["needs_work", "solid", "strong"]).toContain(evaluation!.overallBand);
    expect(evaluation!.delivery.source).toBe("deterministic");
    expect(evaluation!.nextAction.instruction.length).toBeGreaterThanOrEqual(20);

    // Canonical row landed in evaluation_versions for this answer.
    const versions = await getDb()
      .select()
      .from(evaluationVersions)
      .where(eq(evaluationVersions.answerId, submit.body.submissionId));
    expect(versions.length).toBe(1);
    expect(versions[0]!.overallBand).toBe(evaluation!.overallBand);
    expect((versions[0]!.result as { overallBand: string }).overallBand).toBe(evaluation!.overallBand);

    void user;
  });

  it("is idempotent: the same key returns the original submission", async () => {
    const { accessToken } = await registerUser(uniqueEmail("voice2"));
    const [question] = await getDb().select({ id: questions.id }).from(questions).limit(1);
    const auth = { Authorization: `Bearer ${accessToken}` };

    const first = await request(getApp())
      .post(`/api/submissions/voice?questionId=${question!.id}&idempotencyKey=idem-key-000001`)
      .set(auth)
      .set("Content-Type", "audio/webm")
      .send(Buffer.alloc(1024, 1))
      .expect(202);

    const second = await request(getApp())
      .post(`/api/submissions/voice?questionId=${question!.id}&idempotencyKey=idem-key-000001`)
      .set(auth)
      .set("Content-Type", "audio/webm")
      .send(Buffer.alloc(1024, 1))
      .expect(200);
    expect(second.body.idempotent).toBe(true);
    expect(second.body.submissionId).toBe(first.body.submissionId);
  });

  it("rejects empty bodies and unknown questions", async () => {
    const { accessToken } = await registerUser(uniqueEmail("voice3"));
    const auth = { Authorization: `Bearer ${accessToken}` };

    await request(getApp())
      .post("/api/submissions/voice?questionId=1&idempotencyKey=key-empty-00001")
      .set(auth)
      .set("Content-Type", "audio/webm")
      .send()
      .expect(400);

    await request(getApp())
      .post("/api/submissions/voice?questionId=999999&idempotencyKey=key-noq-000001")
      .set(auth)
      .set("Content-Type", "audio/webm")
      .send(Buffer.alloc(128, 1))
      .expect(404);
  });
});
