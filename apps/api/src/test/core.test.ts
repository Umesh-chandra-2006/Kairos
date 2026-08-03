import { describe, expect, it } from "vitest";
import request from "supertest";
import { getDb } from "@kairos/db";
import { getApp, registerUser, uniqueEmail } from "./helpers";
import { streakService } from "../services/streak.service";

describe("streak API", () => {
  it("returns a zero streak for a new user", async () => {
    const { accessToken } = await registerUser(uniqueEmail("st_new"));
    const res = await request(getApp())
      .get("/api/streak")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.streak.current).toBe(0);
    expect(res.body.streak.longest).toBe(0);
    expect(res.body.streak.freezesRemaining).toBeGreaterThanOrEqual(0);
  });

  it("refills freezes (returns updated streak)", async () => {
    const { accessToken } = await registerUser(uniqueEmail("st_refill"));
    const res = await request(getApp())
      .post("/api/streak/refill")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.streak).toHaveProperty("freezesRemaining");
  });

  it("consumes a freeze to protect the streak after a missed day", async () => {
    const { user } = await registerUser(uniqueEmail("st_freeze"));
    const db = getDb();

    const day1 = await streakService.recordActivity(db, user.id, "2026-07-01");
    expect(day1.current).toBe(1);
    expect(day1.freezesRemaining).toBe(1);

    const day2 = await streakService.recordActivity(db, user.id, "2026-07-02");
    expect(day2.current).toBe(2);
    expect(day2.freezesRemaining).toBe(1);

    const day3 = await streakService.recordActivity(db, user.id, "2026-07-04"); // missed 07-03
    expect(day3.current).toBe(3);
    expect(day3.freezesRemaining).toBe(0);

    const day4 = await streakService.recordActivity(db, user.id, "2026-07-06"); // missed 07-05, no freezes left
    expect(day4.current).toBe(1);
  });

  it("does not consume a freeze for a gap longer than one missed day", async () => {
    const { user } = await registerUser(uniqueEmail("st_gap"));
    const db = getDb();

    const day1 = await streakService.recordActivity(db, user.id, "2026-07-01");
    expect(day1.current).toBe(1);
    expect(day1.freezesRemaining).toBe(1);

    const day2 = await streakService.recordActivity(db, user.id, "2026-07-02");
    expect(day2.current).toBe(2);

    const later = await streakService.recordActivity(db, user.id, "2026-07-05"); // missed 07-03 and 07-04
    expect(later.current).toBe(1); // streak reset, freeze NOT consumed
    expect(later.freezesRemaining).toBe(1);
  });

  it("requires auth", async () => {
    await request(getApp()).get("/api/streak").expect(401);
  });
});

describe("leaderboard API", () => {
  it("returns a leaderboard and the caller's rank", async () => {
    const { accessToken } = await registerUser(uniqueEmail("lb"));
    const res = await request(getApp())
      .get("/api/leaderboard")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(Array.isArray(res.body.entries)).toBe(true);

    const rank = await request(getApp())
      .get("/api/leaderboard/me/rank")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(rank.body).toHaveProperty("rank");
  });
});

describe("health API", () => {
  it("reports healthy", async () => {
    const res = await request(getApp()).get("/api/health").expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.db).toBe(true);
  });
});
