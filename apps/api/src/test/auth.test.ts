import { describe, expect, it } from "vitest";
import request from "supertest";
import { getApp, registerUser, uniqueEmail } from "./helpers";

describe("auth API", () => {
  it("registers a user and returns mobile tokens", async () => {
    const email = uniqueEmail();
    const res = await request(getApp())
      .post("/api/auth/register")
      .send({ name: "Ada", email, password: "Passw0rd!", device: "mobile" })
      .expect(200);

    expect(res.body.accessToken).toBeTypeOf("string");
    expect(res.body.refreshToken).toBeTypeOf("string");
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.emailVerified).toBe(false);
  });

  it("rejects duplicate registration", async () => {
    const email = uniqueEmail("dup");
    await registerUser(email);
    await request(getApp())
      .post("/api/auth/register")
      .send({ name: "Bob", email, password: "Passw0rd!", device: "mobile" })
      .expect(409);
  });

  it("rejects a weak password with field-level details", async () => {
    const res = await request(getApp())
      .post("/api/auth/register")
      .send({ name: "Bob", email: uniqueEmail(), password: "short", device: "mobile" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: ["password"], message: expect.any(String) }),
      ]),
    );
  });

  it("returns 400 (not 500) for a malformed JSON body", async () => {
    const res = await request(getApp())
      .post("/api/auth/register")
      .set("Content-Type", "application/json")
      .send('{"name": broken')
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("logs in with correct credentials", async () => {
    const email = uniqueEmail("login");
    await registerUser(email);
    const res = await request(getApp())
      .post("/api/auth/login")
      .send({ email, password: "Passw0rd!", device: "mobile" })
      .expect(200);
    expect(res.body.accessToken).toBeTypeOf("string");
  });

  it("rejects wrong password", async () => {
    const email = uniqueEmail("badpass");
    await registerUser(email);
    await request(getApp())
      .post("/api/auth/login")
      .send({ email, password: "Wrong123!", device: "mobile" })
      .expect(401);
  });

  it("rotates the refresh token on refresh", async () => {
    const { refreshToken } = await registerUser(uniqueEmail("rot"));
    const res = await request(getApp())
      .post("/api/auth/refresh")
      .send({ device: "mobile", refreshToken })
      .expect(200);
    expect(res.body.accessToken).toBeTypeOf("string");
    expect(res.body.refreshToken).not.toBe(refreshToken);
  });

  it("rejects an already-used refresh token", async () => {
    const { refreshToken } = await registerUser(uniqueEmail("reuse"));
    await request(getApp()).post("/api/auth/refresh").send({ device: "mobile", refreshToken }).expect(200);
    await request(getApp()).post("/api/auth/refresh").send({ device: "mobile", refreshToken }).expect(401);
  });

  it("returns the current user from /me", async () => {
    const { accessToken, user } = await registerUser(uniqueEmail("me"));
    const res = await request(getApp()).get("/api/auth/me").set("Authorization", `Bearer ${accessToken}`).expect(200);
    expect(res.body.user.id).toBe(user.id);
  });

  it("rejects /me without a token", async () => {
    await request(getApp()).get("/api/auth/me").expect(401);
  });

  it("accepts onboarding profile data", async () => {
    const { accessToken } = await registerUser(uniqueEmail("ob"));
    const res = await request(getApp())
      .put("/api/auth/me/onboarding")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        role: "professional",
        level: "intermediate",
        targets: ["System design"],
        notificationTime: "09:00",
        timezone: "Asia/Kolkata",
      })
      .expect(200);
    expect(res.body.user.profile.level).toBe("intermediate");
  });

  it("handles forgot-password (no crash, dry-run email)", async () => {
    const email = uniqueEmail("fp");
    await registerUser(email);
    const res = await request(getApp())
      .post("/api/auth/forgot-password")
      .send({ email })
      .expect(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("logs out and revokes the refresh token", async () => {
    const { refreshToken } = await registerUser(uniqueEmail("out"));
    await request(getApp()).post("/api/auth/logout").send({ device: "mobile", refreshToken }).expect(200);
    await request(getApp()).post("/api/auth/refresh").send({ device: "mobile", refreshToken }).expect(401);
  });
});
