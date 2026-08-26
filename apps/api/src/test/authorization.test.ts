import { describe, expect, it } from "vitest";
import request from "supertest";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@kairos/db";
import { users } from "@kairos/db/schema";
import { getApp, registerUser, uniqueEmail } from "./helpers";

/**
 * Authorization isolation tests — cross-tenant CI matrix.
 * (build-plan §8 Wave 2)
 *
 * College-A TPO → College-A student: allowed
 * College-A TPO → College-B student: forbidden
 * Student A → Student B's evaluation: forbidden
 */
describe("authorization isolation (cross-tenant)", () => {
  async function setupUsers() {
    const tpoA = await registerUser(uniqueEmail("tpoA"), "TPO A");
    const tpoB = await registerUser(uniqueEmail("tpoB"), "TPO B");
    const studentA = await registerUser(uniqueEmail("studA"), "Student A");
    const studentB = await registerUser(uniqueEmail("studB"), "Student B");

    // Assign roles + collegeIds
    const db = getDb();
    await db
      .update(users)
      .set({ role: "tpo", collegeId: "college_a" })
      .where(eq(users.id, tpoA.user.id));
    await db
      .update(users)
      .set({ role: "tpo", collegeId: "college_b" })
      .where(eq(users.id, tpoB.user.id));
    await db
      .update(users)
      .set({ collegeId: "college_a" })
      .where(eq(users.id, studentA.user.id));
    await db
      .update(users)
      .set({ collegeId: "college_b" })
      .where(eq(users.id, studentB.user.id));

    return { tpoA, tpoB, studentA, studentB };
  }

  describe("TPO dashboard access", () => {
    it("College-A TPO can access College-A dashboard", async () => {
      const { tpoA } = await setupUsers();

      const res = await request(getApp())
        .get("/api/tpo/activation")
        .set("Authorization", `Bearer ${tpoA.accessToken}`)
        .expect(200);

      expect(res.body.students).toBeDefined();
    });

    it("College-A TPO gets 403 on TPO endpoint with wrong role", async () => {
      const { studentA } = await setupUsers();

      await request(getApp())
        .get("/api/tpo/activation")
        .set("Authorization", `Bearer ${studentA.accessToken}`)
        .expect(403);
    });

    it("College-A TPO cannot see College-B data via dashboard (data isolation)", async () => {
      const { tpoA, studentB } = await setupUsers();

      // Verify studentB is in college_b
      const [student] = await getDb()
        .select({ collegeId: users.collegeId })
        .from(users)
        .where(eq(users.id, studentB.user.id));
      expect(student!.collegeId).toBe("college_b");

      // TPO A queries activation — should NOT see student B
      const res = await request(getApp())
        .get("/api/tpo/activation")
        .set("Authorization", `Bearer ${tpoA.accessToken}`)
        .expect(200);

      const studentIds = (res.body.students as { userId: number }[]).map(
        (s) => s.userId,
      );
      expect(studentIds).not.toContain(studentB.user.id);
    });

    it("unauthenticated user gets 401 on TPO endpoints", async () => {
      await request(getApp())
        .get("/api/tpo/activation")
        .expect(401);
    });

    it("user with role='user' gets 403 on TPO endpoints", async () => {
      const normal = await registerUser(uniqueEmail("normal"));

      await request(getApp())
        .get("/api/tpo/activation")
        .set("Authorization", `Bearer ${normal.accessToken}`)
        .expect(403);
    });

    it("TPO with no collegeId gets 403", async () => {
      const auth = await registerUser(uniqueEmail("tpoNocollege"));
      const db = getDb();
      await db
        .update(users)
        .set({ role: "tpo" })
        .where(eq(users.id, auth.user.id));

      await request(getApp())
        .get("/api/tpo/activation")
        .set("Authorization", `Bearer ${auth.accessToken}`)
        .expect(403);
    });
  });

  describe("student answer isolation", () => {
    it("student A cannot confirm student B's answer", async () => {
      const { studentA, studentB } = await setupUsers();

      // Student B creates a completed answer via the answers table
      const db = getDb();
      const { questions } = await import("@kairos/db/schema");
      const [question] = await db
        .select({ id: questions.id })
        .from(questions)
        .limit(1);

      const [answer] = await db
        .insert(await import("@kairos/db/schema").then((m) => m.answers))
        .values({
          userId: studentB.user.id,
          questionId: question!.id,
          date: "2026-01-01",
          answerText: "Student B answer",
          status: "completed",
          score: 8,
        })
        .execute();

      // Student A tries to confirm student B's answer → 404 (answer not found for this user)
      await request(getApp())
        .post(`/api/answers/${answer.insertId}/confirm`)
        .set("Authorization", `Bearer ${studentA.accessToken}`)
        .send({ confirmed: true })
        .expect(404);
    });
  });
});
