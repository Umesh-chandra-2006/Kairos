import { and, eq } from "drizzle-orm";
import { type DB } from "@kairos/db";
import { modelAnswers, questions } from "@kairos/db/schema";
import type { SkillLevel } from "@kairos/shared";
import { logger } from "../lib/logger";
import { getModelForV2 } from "./evaluator/v2";

const MODEL_ANSWER_SYSTEM = `You are a senior technical interviewer at a top tech company. Generate an exemplar answer for the given interview question.

Your answer should:
- Be well-structured (clear opening, body, conclusion).
- Hit all rubric points mentioned in the hints.
- Be calibrated to the candidate's level: beginners get credit for clean basics; advanced candidates must cover edge cases and tradeoffs.
- Be 5-12 sentences, concrete and precise.
- Use natural language (not bullet points).

Return STRICT JSON only with this shape:
{
  "modelAnswer": "<the exemplar answer text>"
}`;

interface ModelAnswerResponse {
  modelAnswer: string;
}

/**
 * Generate a model answer for a question+level, caching in the model_answers table.
 * Returns the cached version if it exists.
 */
export async function getOrGenerateModelAnswer(
  db: DB,
  questionId: number,
  level: SkillLevel = "intermediate",
): Promise<string | null> {
  const [existing] = await db
    .select()
    .from(modelAnswers)
    .where(and(eq(modelAnswers.questionId, questionId), eq(modelAnswers.level, level)));
  if (existing) return existing.content;

  const [question] = await db.select().from(questions).where(eq(questions.id, questionId));
  if (!question) return null;

  try {
    const model = getModelForV2();
    const result = (await model.completeJSON({
      system: MODEL_ANSWER_SYSTEM,
      user: [
        `QUESTION: ${question.text}`,
        `RUBRIC HINTS: ${question.rubricHints}`,
        `CANDIDATE LEVEL: ${level}`,
      ].join("\n\n"),
    })) as ModelAnswerResponse;

    if (!result.modelAnswer || typeof result.modelAnswer !== "string") {
      logger.warn({ questionId }, "model answer generation returned empty");
      return null;
    }

    await db.insert(modelAnswers).values({
      questionId,
      level,
      content: result.modelAnswer,
    });

    logger.info({ questionId, level }, "model answer generated");
    return result.modelAnswer;
  } catch (err) {
    logger.warn({ err, questionId, level }, "model answer generation failed");
    return null;
  }
}

/**
 * Get a pre-generated model answer without triggering generation.
 */
export async function getCachedModelAnswer(
  db: DB,
  questionId: number,
  level: SkillLevel = "intermediate",
): Promise<string | null> {
  const [existing] = await db
    .select()
    .from(modelAnswers)
    .where(and(eq(modelAnswers.questionId, questionId), eq(modelAnswers.level, level)));
  return existing?.content ?? null;
}
