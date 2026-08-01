import { count } from "drizzle-orm";
import { loadEnv } from "@kairos/config";
import { getDb, closeDb } from "../client";
import { answers, dailyAssignments, questions } from "../schema";
import { seedQuestions } from "./questions";

async function seed({ force = false }: { force?: boolean } = {}) {
  loadEnv();
  const db = getDb();
  console.log("Connected to database");

  if (force) {
    const [row] = await db.select({ total: count() }).from(questions);
    const total = row?.total ?? 0;
    if (total > 0) {
      // questions is RESTRICT-referenced by answers / daily_assignments
      await db.delete(answers);
      await db.delete(dailyAssignments);
      await db.delete(questions);
      console.log(`Cleared ${total} existing questions`);
    }
  }

  const existing = await db.select({ text: questions.text }).from(questions);
  const existingTexts = new Set(existing.map((q) => q.text));

  const toInsert = seedQuestions.filter((q) => !existingTexts.has(q.text));
  if (toInsert.length > 0) {
    await db.insert(questions).values(toInsert);
  }

  const counts = await db
    .select({ category: questions.category, count: count() })
    .from(questions)
    .groupBy(questions.category);

  console.log(`Seeded. Total questions: ${existing.length + toInsert.length}`);
  console.table(counts);

  await closeDb();
  process.exit(0);
}

const force = process.argv.includes("--force");
seed({ force }).catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
