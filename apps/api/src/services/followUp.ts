import { eq } from "drizzle-orm";
import { type DB } from "@kairos/db";
import { answers, followUps, questions } from "@kairos/db/schema";
import { logger } from "../lib/logger";
import { isEnabled } from "./flags.service";
import { getModelForV2 } from "./evaluator/v2";

const FOLLOWUP_SYSTEM = `You are a senior technical interviewer conducting a follow-up question.

Given the original question, the candidate's transcript, and the specific areas they struggled with, generate ONE targeted follow-up question that:
- Probes the exact weak areas identified.
- Is slightly easier than the original to build confidence.
- Asks for a concrete example or deeper explanation.
- Is a single clear sentence.

Return STRICT JSON only with this shape:
{
  "question": "<the follow-up question>"
}`;

interface FollowUpResponse {
  question: string;
}

/**
 * Generate a follow-up question targeting the weak areas from an evaluation.
 * Feature-flagged by adaptive_followup.
 */
export async function generateFollowUp(
  db: DB,
  parentAnswerId: number,
): Promise<{ questionText: string; weakAreas: string[] } | null> {
  const flagOn = await isEnabled("adaptive_followup", { db });
  if (!flagOn) return null;

  const [answer] = await db
    .select()
    .from(answers)
    .where(eq(answers.id, parentAnswerId));
  if (!answer) return null;

  const [question] = await db.select().from(questions).where(eq(questions.id, answer.questionId));
  if (!question) return null;

  const transcript = answer.transcript ?? answer.answerText;
  const weakAreas = extractWeakAreas(answer.feedback);

  if (weakAreas.length === 0) return null;

  try {
    const model = getModelForV2();
    const result = (await model.completeJSON({
      system: FOLLOWUP_SYSTEM,
      user: [
        `ORIGINAL QUESTION: ${question.text}`,
        `CANDIDATE TRANSCRIPT: ${transcript}`,
        `WEAK AREAS: ${weakAreas.join(", ")}`,
      ].join("\n\n"),
    })) as FollowUpResponse;

    if (!result.question || typeof result.question !== "string") {
      return null;
    }

    await db.insert(followUps).values({
      parentId: parentAnswerId,
      userId: answer.userId,
      questionText: result.question,
      weakAreas,
    });

    logger.info({ parentAnswerId, userId: answer.userId }, "follow-up generated");
    return { questionText: result.question, weakAreas };
  } catch (err) {
    logger.warn({ err, parentAnswerId }, "follow-up generation failed");
    return null;
  }
}

/**
 * Get any existing follow-ups for a given answer.
 */
export async function getFollowUps(db: DB, parentAnswerId: number) {
  return db
    .select()
    .from(followUps)
    .where(eq(followUps.parentId, parentAnswerId));
}

function extractWeakAreas(feedback: string | null): string[] {
  if (!feedback) return [];
  const lines = feedback.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const weakMarkers = ["missing", "lack", "needs improvement", "could improve", "should include", "weak"];
  return lines
    .filter((line) => weakMarkers.some((m) => line.toLowerCase().includes(m)))
    .map((line) => line.replace(/^(however|also|additionally|furthermore|moreover),?\s*/i, "").trim())
    .filter((line) => line.length > 10 && line.length < 200)
    .slice(0, 3);
}
