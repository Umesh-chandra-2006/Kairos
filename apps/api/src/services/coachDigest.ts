import { and, desc, eq, gte } from "drizzle-orm";
import { type DB } from "@kairos/db";
import { answers, questions, users } from "@kairos/db/schema";
import { logger } from "../lib/logger";
import { getModelForV2 } from "./evaluator/v2";

const DIGEST_SYSTEM = `You are a supportive interview coach writing a weekly performance summary.

Based on the user's answer history this week, write a concise digest (3-5 sentences) that:
- Highlights 1-2 specific strengths with concrete examples.
- Identifies 1-2 areas for improvement.
- Suggests a focused practice goal for next week.
- Uses an encouraging, professional tone.

Return STRICT JSON only with this shape:
{
  "summary": "<the digest text, 3-5 sentences>"
}`;

interface DigestResponse {
  summary: string;
}

/**
 * Generate a weekly coach digest for a user based on their last 7 days of answers.
 */
export async function generateWeeklyDigest(
  db: DB,
  userId: number,
): Promise<string | null> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentAnswers = await db
    .select({
      score: answers.score,
      feedback: answers.feedback,
      category: questions.category,
      difficulty: questions.difficulty,
      createdAt: answers.createdAt,
    })
    .from(answers)
    .innerJoin(questions, eq(answers.questionId, questions.id))
    .where(
      and(
        eq(answers.userId, userId),
        eq(answers.status, "completed"),
        gte(answers.createdAt, weekAgo),
      ),
    )
    .orderBy(desc(answers.createdAt));

  if (recentAnswers.length === 0) return null;

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  const userName = user?.name ?? "there";

  const performance = recentAnswers
    .map(
      (a) =>
        `- ${a.category} (${a.difficulty}): score ${a.score ?? "N/A"}/10. ${a.feedback?.slice(0, 100) ?? ""}`,
    )
    .join("\n");

  try {
    const model = getModelForV2();
    const result = (await model.completeJSON({
      system: DIGEST_SYSTEM,
      user: [
        `USER: ${userName}`,
        `ANSWERS THIS WEEK (${recentAnswers.length} total):`,
        performance,
      ].join("\n\n"),
    })) as DigestResponse;

    if (!result.summary || typeof result.summary !== "string") return null;

    logger.info({ userId, answerCount: recentAnswers.length }, "weekly digest generated");
    return result.summary;
  } catch (err) {
    logger.warn({ err, userId }, "weekly digest generation failed");
    return null;
  }
}
