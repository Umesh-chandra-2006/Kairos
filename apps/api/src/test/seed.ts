import { getDb } from "@kairos/db";
import { questions } from "@kairos/db/schema";
import { CATEGORIES, DIFFICULTIES } from "@kairos/shared";

/**
 * Seeds a handful of questions across categories/difficulties so the daily
 * assignment and answer-submit flows have data to work with.
 */
export async function seedTestQuestions(): Promise<void> {
  const db = getDb();

  const existing = await db.select({ id: questions.id }).from(questions).limit(1);
  if (existing.length > 0) return;

  const rows: Array<{
    category: (typeof CATEGORIES)[number];
    difficulty: (typeof DIFFICULTIES)[number];
    text: string;
    rubricHints: string;
  }> = [];

  for (const category of CATEGORIES) {
    for (const difficulty of DIFFICULTIES) {
      rows.push({
        category,
        difficulty,
        text: `[${category}] Explain a ${difficulty} concept from ${category}.`,
        rubricHints: `Cover definitions, examples and edge cases for ${category}.`,
      });
    }
  }

  await db.insert(questions).values(rows);
}
