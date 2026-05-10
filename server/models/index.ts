/**
 * DEPRECATED: MongoDB models have been replaced with Drizzle ORM
 * 
 * This file is kept for backward compatibility only.
 * New code should import directly from drizzle/schema.ts
 * 
 * Migration examples:
 * 
 * Before:
 * import { User } from '../models/index';
 * const user = await User.findOne({ email });
 * 
 * After:
 * import { getDB } from '../lib/db';
 * import { users } from '../../drizzle/schema';
 * import { eq } from 'drizzle-orm';
 * 
 * const db = getDB();
 * const user = await db.query.users.findFirst({
 *   where: eq(users.email, email),
 * });
 */

// Re-export Drizzle schema types for compatibility
export type { User, InsertUser, Question, InsertQuestion, Answer, InsertAnswer, Streak, InsertStreak } from '../../drizzle/schema';

// Export schema objects
export { users, questions, answers, streaks } from '../../drizzle/schema';
