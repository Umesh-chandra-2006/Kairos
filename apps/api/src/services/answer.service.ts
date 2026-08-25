import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { getDb, type DB } from "@kairos/db";
import { answers, questions } from "@kairos/db/schema";
import type { AnswerWithQuestion, SubmitAnswerInput } from "@kairos/shared";
import { SUBMISSION_TO_LEGACY_ANSWER_STATUS } from "@kairos/shared";
import { dateStr } from "../lib/dates";
import { AppError } from "../lib/http";
import { getRuntime } from "../queue";
import { questionService } from "./question.service";

function toAnswerWithQuestion(row: typeof answers.$inferSelect, q: typeof questions.$inferSelect): AnswerWithQuestion {
  return {
    id: row.id,
    questionId: row.questionId,
    date: row.date,
    isPractice: row.dailyKey === null,
    answerText: row.answerText,
    score: row.score,
    feedback: row.feedback,
    modelAnswer: row.modelAnswer,
    // Dual-read projection: V1 clients only ever see legacy status values.
    status: SUBMISSION_TO_LEGACY_ANSWER_STATUS[row.status],
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    question: {
      id: q.id,
      category: q.category,
      difficulty: q.difficulty,
      text: q.text,
      rubricHints: q.rubricHints,
    },
  };
}

export const answerService = {
  async submit(db: DB, userId: number, input: SubmitAnswerInput) {
    const date = dateStr();

    const [existing] = await db
      .select({ id: answers.id })
      .from(answers)
      .where(and(eq(answers.userId, userId), eq(answers.dailyKey, date)));
    if (existing) throw AppError.conflict("You have already answered today's question");

    const question = await questionService.getById(db, input.questionId);
    void question;

    const [inserted] = await db
      .insert(answers)
      .values({
        userId,
        questionId: input.questionId,
        date,
        dailyKey: date,
        answerText: input.answerText,
        status: "pending",
      })
      .$returningId();

    const answerId = inserted!.id;
    const { queue } = getRuntime();
    await queue.enqueue({ answerId, userId, questionId: input.questionId, attempt: 0 });

    return answerId;
  },

  /** Practice submission: no dailyKey (so it never conflicts with the daily answer). */
  async submitPractice(db: DB, userId: number, input: SubmitAnswerInput) {
    const date = dateStr();
    await questionService.getById(db, input.questionId);

    const [inserted] = await db
      .insert(answers)
      .values({
        userId,
        questionId: input.questionId,
        date,
        dailyKey: null,
        answerText: input.answerText,
        status: "pending",
      })
      .$returningId();

    const answerId = inserted!.id;
    const { queue } = getRuntime();
    await queue.enqueue({ answerId, userId, questionId: input.questionId, attempt: 0 });

    return answerId;
  },

  async getById(db: DB, userId: number, id: number): Promise<AnswerWithQuestion> {
    const [row] = await db
      .select()
      .from(answers)
      .where(and(eq(answers.id, id), eq(answers.userId, userId)));
    if (!row) throw AppError.notFound("Answer not found");
    const [q] = await db.select().from(questions).where(eq(questions.id, row.questionId));
    if (!q) throw AppError.notFound("Question not found");
    return toAnswerWithQuestion(row, q);
  },

  async history(db: DB, userId: number, cursor?: number, limit = 20) {
    const conditions = [eq(answers.userId, userId)];
    if (cursor) conditions.push(lt(answers.id, cursor));

    const rows = await db
      .select()
      .from(answers)
      .where(and(...conditions))
      .orderBy(desc(answers.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);

    const qIds = [...new Set(page.map((r) => r.questionId))];
    const questionRows = qIds.length
      ? await db.select().from(questions).where(inArray(questions.id, qIds))
      : [];
    const qMap = new Map(questionRows.map((q) => [q.id, q]));

    return {
      answers: page.map((row) => {
        const q = qMap.get(row.questionId)!;
        return toAnswerWithQuestion(row, q);
      }),
      nextCursor: hasMore ? page[page.length - 1]!.id : null,
    };
  },
};
