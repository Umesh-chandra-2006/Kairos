import { describe, expect, it } from "vitest";
import request from "supertest";
import { getApp, registerUser, uniqueEmail } from "../test/helpers";

describe("request correlation", () => {
  it("mints an x-request-id when none is provided", async () => {
    const res = await request(getApp()).get("/healthz").expect(200);
    expect(res.headers["x-request-id"]).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
  });

  it("echoes a client-provided x-request-id", async () => {
    const res = await request(getApp()).get("/healthz").set("x-request-id", "test-correlation-1234").expect(200);
    expect(res.headers["x-request-id"]).toBe("test-correlation-1234");
  });

  it("rejects malformed inbound request ids with a fresh one", async () => {
    const res = await request(getApp()).get("/healthz").set("x-request-id", "bad id with spaces!").expect(200);
    expect(res.headers["x-request-id"]).not.toBe("bad id with spaces!");
  });
});

describe("error contract carries retryable flag", () => {
  it("marks auth failures as non-retryable", async () => {
    const res = await request(getApp()).get("/api/questions/today").expect(401);
    expect(res.body.error.retryable).toBe(false);
  });

  it("marks not-found as non-retryable", async () => {
    const res = await request(getApp()).get("/api/definitely-not-a-route").expect(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(res.body.error.retryable).toBe(false);
  });
});

describe("domain event helper", () => {
  it("exposes the stable event set", async () => {
    const mod = await import("../lib/obs");
    expect(mod.DOMAIN_EVENTS).toContain("eval_completed");
    expect(mod.DOMAIN_EVENTS).toContain("eval_failed");
    expect(mod.DOMAIN_EVENTS).toContain("eval_claim_skipped");
  });

  it("registers users through the shared helper (smoke)", async () => {
    const { user } = await registerUser(uniqueEmail("obs"));
    expect(user.id).toBeTypeOf("number");
  });
});
