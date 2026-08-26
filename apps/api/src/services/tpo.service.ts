import { and, eq, sql, count, gte } from "drizzle-orm";
import {
  users,
  answers,
  evaluationVersions,
  tpoViews,
  bandConfirmations,
} from "@kairos/db/schema";
import type { DB } from "@kairos/db/client";

export async function logTpoView(
  db: DB,
  userId: number,
  collegeId: string,
  queryType: string,
) {
  await db.insert(tpoViews).values({ userId, collegeId, queryType }).execute();
}

const DAY = 86_400_000;

/**
 * 1. Who is practicing — activation + completion rates.
 */
export async function getActivationStats(db: DB, collegeId: string) {
  const weekAgo = new Date(Date.now() - 7 * DAY);

  return db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      totalAnswers: count(answers.id),
      recentAnswers: sql<number>`SUM(CASE WHEN ${answers.createdAt} >= ${weekAgo} THEN 1 ELSE 0 END)`,
      avgScore: sql<number>`ROUND(AVG(${answers.score}), 1)`,
    })
    .from(users)
    .leftJoin(answers, eq(users.id, answers.userId))
    .where(and(eq(users.collegeId, collegeId), eq(answers.status, "completed")))
    .groupBy(users.id);
}

/**
 * 2. Who is improving — score trend per student over last 4 weeks.
 */
export async function getImprovementTrend(db: DB, collegeId: string) {
  const fourWeeksAgo = new Date(Date.now() - 28 * DAY);
  const twoWeeksAgo = new Date(Date.now() - 14 * DAY);

  return db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      earlyAvg: sql<number>`ROUND(AVG(CASE WHEN ${answers.createdAt} < ${twoWeeksAgo} THEN ${answers.score} END), 1)`,
      lateAvg: sql<number>`ROUND(AVG(CASE WHEN ${answers.createdAt} >= ${twoWeeksAgo} THEN ${answers.score} END), 1)`,
    })
    .from(users)
    .innerJoin(answers, eq(users.id, answers.userId))
    .where(
      and(
        eq(users.collegeId, collegeId),
        eq(answers.status, "completed"),
        gte(answers.createdAt, fourWeeksAgo),
      ),
    )
    .groupBy(users.id);
}

/**
 * 3. Cohort-weak skills — lowest average score per question.
 */
export async function getWeakSkills(db: DB, collegeId: string) {
  return db
    .select({
      questionId: answers.questionId,
      avgScore: sql<number>`ROUND(AVG(${answers.score}), 1)`,
      answerCount: count(answers.id),
    })
    .from(answers)
    .innerJoin(users, eq(answers.userId, users.id))
    .innerJoin(evaluationVersions, eq(answers.id, evaluationVersions.answerId))
    .where(and(eq(users.collegeId, collegeId), eq(answers.status, "completed")))
    .groupBy(answers.questionId)
    .orderBy(sql`AVG(${answers.score}) ASC`);
}

/**
 * 4. Students needing intervention — no activity in 14+ days.
 */
export async function getStudentsNeedingIntervention(db: DB, collegeId: string) {
  const twoWeeksAgo = new Date(Date.now() - 14 * DAY);

  return db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      lastActiveAt: sql<string>`MAX(${answers.createdAt})`,
      totalAnswers: count(answers.id),
    })
    .from(users)
    .leftJoin(answers, eq(users.id, answers.userId))
    .where(
      and(
        eq(users.collegeId, collegeId),
        sql`MAX(${answers.createdAt}) < ${twoWeeksAgo} OR MAX(${answers.createdAt}) IS NULL`,
      ),
    )
    .groupBy(users.id);
}

/**
 * 5. Placement Readiness Trend — longitudinal 4-week view.
 */
export async function getPlacementReadinessTrend(db: DB, collegeId: string) {
  const fourWeeksAgo = new Date(Date.now() - 28 * DAY);

  return db
    .select({
      weekStart: sql<string>`DATE(${answers.createdAt}) - INTERVAL WEEKDAY(DATE(${answers.createdAt})) DAY`,
      avgScore: sql<number>`ROUND(AVG(${answers.score}), 1)`,
      activeStudents: sql<number>`COUNT(DISTINCT ${answers.userId})`,
      strongCount: sql<number>`SUM(CASE WHEN ${evaluationVersions.overallBand} = 'strong' THEN 1 ELSE 0 END)`,
      solidCount: sql<number>`SUM(CASE WHEN ${evaluationVersions.overallBand} = 'solid' THEN 1 ELSE 0 END)`,
      needsWorkCount: sql<number>`SUM(CASE WHEN ${evaluationVersions.overallBand} = 'needs_work' THEN 1 ELSE 0 END)`,
    })
    .from(answers)
    .innerJoin(users, eq(answers.userId, users.id))
    .innerJoin(evaluationVersions, eq(answers.id, evaluationVersions.answerId))
    .where(
      and(
        eq(users.collegeId, collegeId),
        eq(answers.status, "completed"),
        gte(answers.createdAt, fourWeeksAgo),
      ),
    )
    .groupBy(sql`DATE(${answers.createdAt}) - INTERVAL WEEKDAY(DATE(${answers.createdAt})) DAY`)
    .orderBy(sql`DATE(${answers.createdAt}) - INTERVAL WEEKDAY(DATE(${answers.createdAt})) DAY`);
}

/**
 * Band confirmation stats for a college (calibration set growth).
 */
export async function getBandConfirmationStats(db: DB, collegeId: string) {
  return db
    .select({
      totalConfirmations: count(bandConfirmations.id),
      agreementRate: sql<number>`ROUND(100.0 * SUM(CASE WHEN ${bandConfirmations.confirmed} = 1 THEN 1 ELSE 0 END) / COUNT(*), 1)`,
    })
    .from(bandConfirmations)
    .innerJoin(users, eq(bandConfirmations.userId, users.id))
    .where(eq(users.collegeId, collegeId));
}
