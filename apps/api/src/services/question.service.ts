import { and, asc, eq, gt } from "drizzle-orm";
import { type DB } from "@kairos/db";
import { answers, dailyAssignments, questions, type Question as QuestionRow } from "@kairos/db/schema";
import type { Question, QuestionFilters } from "@kairos/shared";
import { dateStr } from "../lib/dates";
import { AppError } from "../lib/http";
import { seedFromInts } from "../lib/ids";

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

async function loadAllActive(db: DB): Promise<QuestionRow[]> {
  return db.select().from(questions).where(eq(questions.isActive, true));
}

/**
 * Deterministic, category-aware daily question pick: seeded by (userId, date)
 * so the same user sees the same question all day and different users see
 * varied questions that rotate across categories daily.
 */
async function assignDailyQuestion(db: DB, userId: number, date: string): Promise<QuestionRow> {
  const all = await loadAllActive(db);
  if (all.length === 0) throw AppError.notFound("No questions available yet");

  const categories = [...new Set(all.map((q) => q.category))];
  const category = categories[seedFromInts(userId, dateSeed(date), 1) % categories.length]!;
  const pool = all.filter((q) => q.category === category);
  const question = pool[seedFromInts(userId, dateSeed(date), 2) % pool.length]!;

  try {
    await db.insert(dailyAssignments).values({ userId, questionId: question.id, date });
  } catch {
    // Unique (userId, date) already exists (race); re-read the committed row.
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
      .where(and(eq(answers.userId, userId), eq(answers.date, date)));
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

  async getById(db: DB, id: number): Promise<Question> {
    const [q] = await db.select().from(questions).where(eq(questions.id, id));
    if (!q) throw AppError.notFound("Question not found");
    return toQuestion(q);
  },
};
