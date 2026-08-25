import { eq } from "drizzle-orm";
import { type DB } from "@kairos/db";
import { questions } from "@kairos/db/schema";
import { logger } from "../lib/logger";
import { getModelForV2 } from "./evaluator/v2";

export interface RubricCriterion {
  id: string;
  description: string;
  weight: number;
  required: boolean;
}

export interface RubricJson {
  version: 1;
  criteria: RubricCriterion[];
}

const RUBRIC_SYSTEM = `You are an interview coach who converts informal rubric notes into structured grading criteria.

Given an interview question and its rubric hints, extract each distinct concept the candidate should address as a separate criterion.

Return STRICT JSON only with this shape:
{
  "criteria": [
    {
      "id": "short-kebab-id",
      "description": "one clear sentence describing what the candidate should demonstrate",
      "weight": 3,
      "required": true
    }
  ]
}

Rules:
- weight is 1 (nice-to-have) to 5 (essential).
- required is true for weights >= 4.
- id is a short kebab-case identifier (e.g. "time-complexity", "edge-cases").
- Extract 3-8 criteria. Do not invent criteria beyond what the hints mention.
- Do not include trivially obvious criteria.`;

/**
 * Generate structured rubric JSON from plain-text rubricHints.
 * Stores the result on the question row and returns it.
 */
export async function generateRubric(db: DB, questionId: number): Promise<RubricJson | null> {
  const [row] = await db.select().from(questions).where(eq(questions.id, questionId));
  if (!row) return null;
  if (row.rubricJson) return row.rubricJson as RubricJson;

  try {
    const model = getModelForV2();
    const result = await model.completeJSON({
      system: RUBRIC_SYSTEM,
      user: [
        `QUESTION: ${row.text}`,
        `RUBRIC HINTS: ${row.rubricHints}`,
      ].join("\n\n"),
    });

    const rubric = result as RubricJson;
    if (!rubric.criteria || !Array.isArray(rubric.criteria) || rubric.criteria.length === 0) {
      logger.warn({ questionId }, "rubric generation returned empty criteria");
      return null;
    }

    await db.update(questions).set({ rubricJson: rubric as never }).where(eq(questions.id, questionId));
    logger.info({ questionId, count: rubric.criteria.length }, "rubric generated");
    return rubric;
  } catch (err) {
    logger.warn({ err, questionId }, "rubric generation failed");
    return null;
  }
}

/**
 * Get rubric for a question, generating it if needed.
 */
export async function getRubric(db: DB, questionId: number): Promise<RubricJson | null> {
  const [row] = await db.select().from(questions).where(eq(questions.id, questionId));
  if (!row) return null;
  if (row.rubricJson) return row.rubricJson as RubricJson;
  return generateRubric(db, questionId);
}
