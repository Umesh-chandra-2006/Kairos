import { describe, expect, it } from "vitest";
import { getDb } from "@kairos/db";
import { answers, questions, users } from "@kairos/db/schema";
import { eq } from "drizzle-orm";
import { dateStr } from "../lib/dates";
import { generateRubric, getRubric } from "../services/rubric";
import { getOrGenerateModelAnswer, getCachedModelAnswer } from "../services/modelAnswer";
import { generateFollowUp, getFollowUps } from "../services/followUp";
import { generateWeeklyDigest } from "../services/coachDigest";

async function seedTestQuestion(): Promise<number> {
  const db = getDb();
  const [existing] = await db.select({ id: questions.id }).from(questions).limit(1);
  if (existing) return existing.id;
  const [q] = await db
    .insert(questions)
    .values({
      category: "DSA",
      difficulty: "medium",
      text: "Explain how hash maps handle collisions.",
      rubricHints: "Cover open addressing, chaining, load factor, and amortized lookup time.",
    })
    .execute();
  return Number(q.insertId);
}

async function seedTestUser(): Promise<number> {
  const db = getDb();
  const email = `test_${Date.now()}_${Math.random().toString(36).slice(2)}@test.dev`;
  const [u] = await db.insert(users).values({ name: "Test", email, passwordHash: "x" }).execute();
  return Number(u.insertId);
}

async function seedAnswerWithFeedback(questionId: number, feedback: string, userId: number): Promise<number> {
  const db = getDb();
  const [a] = await db
    .insert(answers)
    .values({
      userId,
      questionId,
      date: dateStr(),
      dailyKey: null,
      answerText: "A hash map stores key-value pairs and uses a hash function to compute an index.",
      status: "completed",
      score: 5,
      feedback,
    })
    .execute();
  return Number(a.insertId);
}

describe("rubric service", () => {
  it("returns null for non-existent question", async () => {
    const db = getDb();
    const result = await generateRubric(db, 999999);
    expect(result).toBeNull();
  });

  it("getRubric returns null for non-existent question", async () => {
    const db = getDb();
    const result = await getRubric(db, 999999);
    expect(result).toBeNull();
  });

  it("mock provider returns null gracefully (no rubric-shaped response)", async () => {
    const db = getDb();
    const [q] = await db
      .insert(questions)
      .values({
        category: "OS",
        difficulty: "easy",
        text: "What is a deadlock?",
        rubricHints: "Cover conditions, prevention, detection and recovery.",
      })
      .execute();
    const rubric = await generateRubric(db, Number(q.insertId));
    expect(rubric).toBeNull();
  });

  it("getRubric returns cached rubric if already set", async () => {
    const db = getDb();
    const qId = await seedTestQuestion();
    const fakeRubric = { version: 1 as const, criteria: [{ id: "test", description: "test", weight: 3, required: false }] };
    await db.update(questions).set({ rubricJson: fakeRubric as never }).where(eq(questions.id, qId));
    const result = await getRubric(db, qId);
    expect(result).not.toBeNull();
    expect(result!.version).toBe(1);
    expect(result!.criteria).toHaveLength(1);
    expect(result!.criteria[0]!.id).toBe("test");
  });
});

describe("modelAnswer service", () => {
  it("returns null for non-existent question", async () => {
    const db = getDb();
    const result = await getOrGenerateModelAnswer(db, 999999);
    expect(result).toBeNull();
  });

  it("mock provider returns null gracefully (no modelAnswer field)", async () => {
    const db = getDb();
    const qId = await seedTestQuestion();
    const answer = await getOrGenerateModelAnswer(db, qId, "intermediate");
    expect(answer).toBeNull();
  });

  it("getCachedModelAnswer returns null before generation", async () => {
    const db = getDb();
    const qId = await seedTestQuestion();
    const cached = await getCachedModelAnswer(db, qId, "advanced");
    expect(cached).toBeNull();
  });

  it("getCachedModelAnswer returns after manual seed", async () => {
    const db = getDb();
    const qId = await seedTestQuestion();
    const { modelAnswers } = await import("@kairos/db/schema");
    await db.delete(modelAnswers).where(eq(modelAnswers.questionId, qId));
    await db.insert(modelAnswers).values({ questionId: qId, level: "beginner", content: "Seed answer text." });
    const cached = await getCachedModelAnswer(db, qId, "beginner");
    expect(cached).toBe("Seed answer text.");
  });
});

describe("followUp service", () => {
  it("returns null for non-existent answer", async () => {
    const db = getDb();
    const result = await generateFollowUp(db, 999999);
    expect(result).toBeNull();
  });

  it("returns null when weak areas are empty", async () => {
    const db = getDb();
    const qId = await seedTestQuestion();
    const userId = await seedTestUser();
    const answerId = await seedAnswerWithFeedback(
      qId,
      "Strong answer. Good coverage of all topics. Well structured response.",
      userId,
    );
    const result = await generateFollowUp(db, answerId);
    expect(result).toBeNull();
  });

  it("generates follow-up or returns null gracefully (flag off + mock shape)", async () => {
    const db = getDb();
    const qId = await seedTestQuestion();
    const userId = await seedTestUser();
    const answerId = await seedAnswerWithFeedback(
      qId,
      "Missing explanation of open addressing collision resolution. Could improve discussion of load factor.",
      userId,
    );
    const result = await generateFollowUp(db, answerId);
    expect(result).toBeNull();
  });

  it("getFollowUps returns stored follow-ups", async () => {
    const db = getDb();
    const qId = await seedTestQuestion();
    const userId = await seedTestUser();
    const answerId = await seedAnswerWithFeedback(
      qId,
      "Missing explanation of load factor. Should include discussion of bucket sizing.",
      userId,
    );
    await generateFollowUp(db, answerId);
    const followUpsList = await getFollowUps(db, answerId);
    expect(Array.isArray(followUpsList)).toBe(true);
  });
});

describe("coachDigest service", () => {
  it("returns null for non-existent user", async () => {
    const db = getDb();
    const result = await generateWeeklyDigest(db, 999999);
    expect(result).toBeNull();
  });

  it("returns null for user with no completed answers", async () => {
    const db = getDb();
    const userId = await seedTestUser();
    const result = await generateWeeklyDigest(db, userId);
    expect(result).toBeNull();
  });
});
