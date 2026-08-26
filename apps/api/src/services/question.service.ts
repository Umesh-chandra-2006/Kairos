import { and, asc, eq, gt } from "drizzle-orm";
import { type DB } from "@kairos/db";
import { answers, dailyAssignments, questions, type Question as QuestionRow } from "@kairos/db/schema";
import type { Question, QuestionFilters } from "@kairos/shared";
import { dateStr } from "../lib/dates";
import { AppError } from "../lib/http";
import { seedFromInts } from "../lib/ids";
import { getDailyPool } from "./questionCache";
import { computeSkillProfile, pickAdaptiveQuestion } from "./adaptive";
import { isEnabled } from "./flags.service";

function toQuestion(q: QuestionRow): Question {
  return {
    id: q.id,
    category: q.category,
    difficulty: q.difficulty,
    text: q.text,
    rubricHints: q.rubricHints,
  };
}

function dateSeed(date: string): number {
  return Number(date.replace(/\D/g, ""));
}

/**
 * Deterministic daily challenge: seeded by `date` only so every user sees the
 * exact same high-impact question all day. Core categories only (practice-only
 * questions are excluded from the daily pool).
 *
 * When `adaptive_question_selection` is enabled, the per-user adaptive picker
 * selects a question at the user's skill level instead of the flat date hash.
 */
async function assignDailyQuestion(db: DB, userId: number, date: string): Promise<QuestionRow> {
  const all = await getDailyPool(db);
  if (all.length === 0) throw AppError.notFound("No questions available yet");

  const seed = dateSeed(date);
  const adaptive = await isEnabled("adaptive_question_selection", { userId, db });

  let question: QuestionRow;
  if (adaptive) {
    const profile = await computeSkillProfile(db, userId);
    question = pickAdaptiveQuestion(all, profile, undefined, seed);
  } else {
    const categories = [...new Set(all.map((q) => q.category))];
    const category = categories[seedFromInts(seed, 1) % categories.length]!;
    const pool = all.filter((q) => q.category === category);
    question = pool[seedFromInts(seed, 2) % pool.length]!;
  }

  try {
    await db.insert(dailyAssignments).values({ userId, questionId: question.id, date });
  } catch {
    const [existing] = await db
      .select()
      .from(dailyAssignments)
      .where(and(eq(dailyAssignments.userId, userId), eq(dailyAssignments.date, date)));
    if (existing) {
      const [q] = await db.select().from(questions).where(eq(questions.id, existing.questionId));
      if (q) return q;
    }
  }
  return question;
}

export const questionService = {
  async today(db: DB, userId: number) {
    const date = dateStr();

    const [existing] = await db
      .select({ id: answers.id })
      .from(answers)
      .where(and(eq(answers.userId, userId), eq(answers.dailyKey, date)));
    if (existing) {
      return { question: null, alreadyAnswered: true, answerId: existing.id };
    }

    const [assignment] = await db
      .select()
      .from(dailyAssignments)
      .where(and(eq(dailyAssignments.userId, userId), eq(dailyAssignments.date, date)));

    let question: QuestionRow | undefined;
    if (assignment) {
      [question] = await db.select().from(questions).where(eq(questions.id, assignment.questionId));
    }
    if (!question) {
      question = await assignDailyQuestion(db, userId, date);
    }

    return { question: toQuestion(question), alreadyAnswered: false };
  },

  async list(db: DB, filters: QuestionFilters) {
    const conditions = [eq(questions.isActive, true)];
    if (filters.category) conditions.push(eq(questions.category, filters.category));
    if (filters.difficulty) conditions.push(eq(questions.difficulty, filters.difficulty));
    if (filters.cursor) conditions.push(gt(questions.id, filters.cursor));

    const rows = await db
      .select()
      .from(questions)
      .where(and(...conditions))
      .orderBy(asc(questions.id))
      .limit(filters.limit + 1);

    const hasMore = rows.length > filters.limit;
    const page = rows.slice(0, filters.limit);
    return {
      questions: page.map(toQuestion),
      nextCursor: hasMore ? page[page.length - 1]!.id : null,
    };
  },

  /**
   * Active question for practice mode, optionally filtered by category.
   * When `skill_engine` is enabled, picks at the user's skill level.
   * Spaced repetition reviews are mixed into the pool when due.
   */
  async practice(db: DB, category?: string, userId?: number): Promise<Question> {
    const conditions = [eq(questions.isActive, true)];
    if (category) conditions.push(eq(questions.category, category as QuestionRow["category"]));

    const rows = await db.select().from(questions).where(and(...conditions));
    if (rows.length === 0) throw AppError.notFound("No questions found for this category");

    const useAdaptive = userId !== undefined && (await isEnabled("skill_engine", { userId, db }));

    // Mix in due spaced-repetition reviews
    if (userId !== undefined) {
      const { mixReviewsIntoPool } = await import("./spacedRepetition.js");
      const mixed = await mixReviewsIntoPool(db, userId, rows);
      if (mixed.length > 0 && mixed[0]!.isReview) {
        const reviewRow = rows.find((r) => r.id === mixed[0]!.questionId);
        if (reviewRow) return toQuestion(reviewRow);
      }
    }

    if (useAdaptive && userId !== undefined) {
      const profile = await computeSkillProfile(db, userId);
      return toQuestion(pickAdaptiveQuestion(rows, profile, category));
    }

    return toQuestion(rows[Math.floor(Math.random() * rows.length)]!);
  },

  async getById(db: DB, id: number): Promise<Question> {
    const [q] = await db.select().from(questions).where(eq(questions.id, id));
    if (!q) throw AppError.notFound("Question not found");
    return toQuestion(q);
  },
};
