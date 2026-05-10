import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, index, unique, uniqueIndex } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Users table - stores user profile information
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: text("name").notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  profileRole: mysqlEnum("profileRole", ["student", "professional"]),
  profileLevel: mysqlEnum("profileLevel", ["beginner", "intermediate", "advanced"]),
  profileTargets: text("profileTargets"), // JSON string
  notificationTime: varchar("notificationTime", { length: 10 }).default("09:00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Questions table - stores daily interview questions
 */
export const questions = mysqlTable("questions", {
  id: int("id").autoincrement().primaryKey(),
  category: mysqlEnum("category", ["DSA", "OS", "DBMS", "Networks", "OOP", "SystemDesign", "Behavioral", "FullStack", "Frontend", "Backend", "HR", "Cloud", "Security", "Testing", "DevOps", "Mobile", "MachineLearning", "Agile", "Product"]).notNull(),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).notNull(),
  text: text("text").notNull(),
  rubricHints: text("rubricHints").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  categoryIdx: index("category_idx").on(table.category),
}));

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;

/**
 * Answers table - stores user answers and evaluations
 */
export const answers = mysqlTable("answers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  questionId: int("questionId").notNull().references(() => questions.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  answerText: text("answerText").notNull(),
  score: int("score").notNull(), // 1-10
  feedback: text("feedback").notNull(),
  modelAnswer: text("modelAnswer").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  questionIdIdx: index("questionId_idx").on(table.questionId),
  dateIdx: index("date_idx").on(table.date),
  userQuestionDateUnique: uniqueIndex("userId_question_date_unique").on(table.userId, table.questionId, table.date),
}));

export type Answer = typeof answers.$inferSelect;
export type InsertAnswer = typeof answers.$inferInsert;

/**
 * Streaks table - tracks user answer streaks
 */
export const streaks = mysqlTable("streaks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  current: int("current").notNull().default(0),
  longest: int("longest").notNull().default(0),
  lastActiveDate: varchar("lastActiveDate", { length: 10 }), // YYYY-MM-DD format
  freezesRemaining: int("freezesRemaining").notNull().default(1),
  lastFreezeRefill: varchar("lastFreezeRefill", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
}));

export type Streak = typeof streaks.$inferSelect;
export type InsertStreak = typeof streaks.$inferInsert;

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  answers: many(answers),
  streak: one(streaks),
}));

export const answersRelations = relations(answers, ({ one }) => ({
  user: one(users, { fields: [answers.userId], references: [users.id] }),
  question: one(questions, { fields: [answers.questionId], references: [questions.id] }),
}));

export const streaksRelations = relations(streaks, ({ one }) => ({
  user: one(users, { fields: [streaks.userId], references: [users.id] }),
}));

export const questionsRelations = relations(questions, ({ many }) => ({
  answers: many(answers),
}));