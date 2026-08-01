import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import {
  ANSWER_STATUSES,
  CATEGORIES,
  DIFFICULTIES,
  SKILL_LEVELS,
  USER_ROLES,
  type Category,
  type Difficulty,
} from "@kairos/shared";

export const USER_ROLE_ENUM = ["user", "admin"] as const;
export type UserRoleDb = (typeof USER_ROLE_ENUM)[number];

export type ProfileJson = {
  role: (typeof USER_ROLES)[number];
  level: (typeof SKILL_LEVELS)[number];
  targets: string[];
  notificationTime: string;
  timezone?: string;
} | null;

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
    name: varchar("name", { length: 120 }),
    role: mysqlEnum("role", USER_ROLE_ENUM).default("user").notNull(),
    emailVerified: boolean("emailVerified").default(false).notNull(),
    profile: json("profile").$type<ProfileJson>().default(null),
    timezone: varchar("timezone", { length: 64 }).default("Asia/Kolkata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ---------------------------------------------------------------------------
// refresh_tokens — rotating refresh sessions (revocable)
// ---------------------------------------------------------------------------
export const refreshTokens = mysqlTable(
  "refresh_tokens",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    revokedAt: timestamp("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    ip: varchar("ip", { length: 45 }),
    userAgent: varchar("userAgent", { length: 255 }),
  },
  (t) => [
    index("refresh_tokens_user_idx").on(t.userId),
    uniqueIndex("refresh_tokens_hash_idx").on(t.tokenHash),
    index("refresh_tokens_expiry_idx").on(t.expiresAt),
  ],
);

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = typeof refreshTokens.$inferInsert;

// ---------------------------------------------------------------------------
// email_tokens — email verification + password reset
// ---------------------------------------------------------------------------
export const EMAIL_TOKEN_TYPE_ENUM = ["verify_email", "reset_password"] as const;

export const emailTokens = mysqlTable(
  "email_tokens",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
    type: mysqlEnum("type", EMAIL_TOKEN_TYPE_ENUM).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    usedAt: timestamp("usedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("email_tokens_hash_idx").on(t.tokenHash),
    index("email_tokens_user_type_idx").on(t.userId, t.type),
  ],
);

export type EmailToken = typeof emailTokens.$inferSelect;
export type InsertEmailToken = typeof emailTokens.$inferInsert;

// ---------------------------------------------------------------------------
// questions
// ---------------------------------------------------------------------------
export const questions = mysqlTable(
  "questions",
  {
    id: int("id").autoincrement().primaryKey(),
    category: mysqlEnum("category", CATEGORIES).notNull().$type<Category>(),
    difficulty: mysqlEnum("difficulty", DIFFICULTIES).notNull().$type<Difficulty>(),
    text: text("text").notNull(),
    rubricHints: text("rubricHints").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("questions_cat_diff_idx").on(t.category, t.difficulty),
    index("questions_active_idx").on(t.isActive),
  ],
);

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;

// ---------------------------------------------------------------------------
// answers — one per user per day; AI evaluation status tracked on the row
// ---------------------------------------------------------------------------
export const answers = mysqlTable(
  "answers",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: int("questionId")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    date: varchar("date", { length: 10 }).notNull(),
    answerText: text("answerText").notNull(),
    score: int("score"),
    feedback: text("feedback"),
    modelAnswer: text("modelAnswer"),
    status: mysqlEnum("status", ANSWER_STATUSES).default("pending").notNull(),
    errorMessage: text("errorMessage"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    uniqueIndex("answers_user_date_idx").on(t.userId, t.date),
    index("answers_user_created_idx").on(t.userId, t.createdAt),
    index("answers_question_idx").on(t.questionId),
  ],
);

export type Answer = typeof answers.$inferSelect;
export type InsertAnswer = typeof answers.$inferInsert;

// ---------------------------------------------------------------------------
// streaks
// ---------------------------------------------------------------------------
export const streaks = mysqlTable(
  "streaks",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    current: int("current").default(0).notNull(),
    longest: int("longest").default(0).notNull(),
    lastActiveDate: varchar("lastActiveDate", { length: 10 }),
    freezesRemaining: int("freezesRemaining").default(1).notNull(),
    lastFreezeRefill: varchar("lastFreezeRefill", { length: 10 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [uniqueIndex("streaks_user_idx").on(t.userId)],
);

export type Streak = typeof streaks.$inferSelect;
export type InsertStreak = typeof streaks.$inferInsert;

// ---------------------------------------------------------------------------
// daily_assignments — deterministic per-user per-day question
// ---------------------------------------------------------------------------
export const dailyAssignments = mysqlTable(
  "daily_assignments",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: int("questionId")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    date: varchar("date", { length: 10 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("daily_assignments_user_date_idx").on(t.userId, t.date),
    index("daily_assignments_question_date_idx").on(t.questionId, t.date),
  ],
);

export type DailyAssignment = typeof dailyAssignments.$inferSelect;
export type InsertDailyAssignment = typeof dailyAssignments.$inferInsert;

// ---------------------------------------------------------------------------
// push_subscriptions — web-push (endpoint+keys) and Expo push tokens
// ---------------------------------------------------------------------------
export const PUSH_CHANNEL_ENUM = ["web", "expo"] as const;

export const pushSubscriptions = mysqlTable(
  "push_subscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channel: mysqlEnum("channel", PUSH_CHANNEL_ENUM).notNull(),
    token: varchar("token", { length: 512 }).notNull(),
    keys: json("keys").$type<{ p256dh: string; auth: string } | null>().default(null),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    uniqueIndex("push_subscriptions_user_token_idx").on(t.userId, t.channel, t.token),
  ],
);

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

// ---------------------------------------------------------------------------
// notification_prefs
// ---------------------------------------------------------------------------
export const notificationPrefs = mysqlTable(
  "notification_prefs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pushEnabled: boolean("pushEnabled").default(true).notNull(),
    evalNotifications: boolean("evalNotifications").default(true).notNull(),
    streakReminder: boolean("streakReminder").default(false).notNull(),
    reminderTime: varchar("reminderTime", { length: 5 }).default("09:00").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [uniqueIndex("notification_prefs_user_idx").on(t.userId)],
);

export type NotificationPrefs = typeof notificationPrefs.$inferSelect;
export type InsertNotificationPrefs = typeof notificationPrefs.$inferInsert;

// ---------------------------------------------------------------------------
// notification_outbox — reliable push/email delivery with retries
// ---------------------------------------------------------------------------
export const NOTIFICATION_TYPE_ENUM = [
  "eval_completed",
  "streak_milestone",
  "streak_reminder",
] as const;
export const NOTIFICATION_CHANNEL_ENUM = ["web_push", "expo_push", "email"] as const;
export const NOTIFICATION_STATUS_ENUM = ["pending", "sent", "failed"] as const;

export const notificationOutbox = mysqlTable(
  "notification_outbox",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", NOTIFICATION_TYPE_ENUM).notNull(),
    channel: mysqlEnum("channel", NOTIFICATION_CHANNEL_ENUM).notNull(),
    payload: json("payload").$type<Record<string, unknown>>(),
    status: mysqlEnum("status", NOTIFICATION_STATUS_ENUM).default("pending").notNull(),
    attempts: int("attempts").default(0).notNull(),
    lastAttemptAt: timestamp("lastAttemptAt"),
    sentAt: timestamp("sentAt"),
    error: text("error"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    index("notification_outbox_status_idx").on(t.status),
    index("notification_outbox_user_idx").on(t.userId),
  ],
);

export type NotificationOutbox = typeof notificationOutbox.$inferSelect;
export type InsertNotificationOutbox = typeof notificationOutbox.$inferInsert;
