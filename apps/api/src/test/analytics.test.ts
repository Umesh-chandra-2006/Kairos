import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { getDb } from "@kairos/db";
import { analyticsEvents } from "@kairos/db/schema";
import { getApp, registerUser, uniqueEmail } from "../test/helpers";

afterEach(async () => {
  await getDb().delete(analyticsEvents).execute().catch(() => undefined);
});

describe("analytics batch ingest", () => {
  it("requires auth", async () => {
    await request(getApp()).post("/api/analytics/events").send({ events: [] }).expect(401);
  });

  it("accepts a batch and stamps the authenticated userId", async () => {
    const { accessToken, user } = await registerUser(uniqueEmail("ana"));

    const res = await request(getApp())
      .post("/api/analytics/events")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        events: [
          { name: "app_open", clientTs: "2026-08-25T09:00:00Z" },
          { name: "answer_submitted", props: { mode: "practice", questionId: 1 } },
        ],
      })
      .expect(202);
    expect(res.body.accepted).toBe(2);

    const rows = await getDb().select().from(analyticsEvents);
    expect(rows.length).toBe(2);
    expect(rows.every((r) => r.userId === user.id)).toBe(true);
    expect(rows.map((r) => r.name).sort()).toEqual(["answer_submitted", "app_open"]);
  });

  it("rejects unknown event names and oversized batches", async () => {
    const { accessToken } = await registerUser(uniqueEmail("ana2"));
    const auth = { Authorization: `Bearer ${accessToken}` };

    await request(getApp())
      .post("/api/analytics/events")
      .set(auth)
      .send({ events: [{ name: "not_a_real_event" }] })
      .expect(400);

    await request(getApp())
      .post("/api/analytics/events")
      .set(auth)
      .send({ events: Array.from({ length: 101 }, () => ({ name: "app_open" })) })
      .expect(400);

    const rows = await getDb().select().from(analyticsEvents);
    expect(rows.length).toBe(0);
  });
});
