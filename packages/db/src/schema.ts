import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import {
  ANSWER_STATUSES,
  BANDS,
  CATEGORIES,
  DIFFICULTIES,
  FEATURE_FLAGS,
  FUNNEL_EVENTS,
  SKILL_LEVELS,
  USER_ROLES,
  type Category,
  type Difficulty,
} from "@kairos/shared";

/**
 * Status column values for `answers`. V1 statuses are retained for dual-read
 * compatibility; V2 submission-lifecycle values are appended (build-plan §0.3).
 * New writes must use SUBMISSION_STATUSES values only.
 */
export const ANSWER_STATUS_DB_ENUM = [
  ...ANSWER_STATUSES,
  "created",
  "queued",
  "processing",
  "cancelled",
] as const;
export type AnswerStatusDb = (typeof ANSWER_STATUS_DB_ENUM)[number];

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
    /** Structured rubric criteria (versioned JSON). null = not yet generated. */
    rubricJson: json("rubricJson").$type<{
      version: 1;
      criteria: { id: string; description: string; weight: number; required: boolean }[];
    } | null>().$default(() => null),
    isActive: boolean("isActive").default(true).notNull(),
    // Practice-only questions (non-core categories) are excluded from the daily
    // challenge pool but remain reachable via practice mode.
    practiceOnly: boolean("practiceOnly").default(false).notNull(),
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
// answers — one daily answer per user per day (via nullable `dailyKey` unique),
// plus unlimited practice answers (dailyKey = NULL). `date` is kept for display
// and history grouping. Streaks count only daily answers.
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
    dailyKey: varchar("dailyKey", { length: 10 }),
    answerText: text("answerText").notNull(),
    score: int("score"),
    feedback: text("feedback"),
    modelAnswer: text("modelAnswer"),
    status: mysqlEnum("status", ANSWER_STATUS_DB_ENUM).default("pending").notNull(),
    // Client-supplied idempotency key for practice submissions; daily answers
    // keep their natural (userId, dailyKey) uniqueness. NULL never collides.
    idempotencyKey: varchar("idempotencyKey", { length: 64 }),
    // --- V2 voice submission columns (build-plan Wave 1) --------------------
    /** Storage key of the uploaded audio (AudioStorage abstraction). */
    audioKey: varchar("audioKey", { length: 255 }),
    /** ASR transcript — the text the evaluator actually graded. */
    transcript: text("transcript"),
    durationMs: int("durationMs"),
    languageBlocked: boolean("languageBlocked").default(false).notNull(),
    errorMessage: text("errorMessage"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    // NULL dailyKey values (practice answers) never collide; daily answers are
    // unique per user per day.
    uniqueIndex("answers_user_dailykey_idx").on(t.userId, t.dailyKey),
    uniqueIndex("answers_user_idem_idx").on(t.userId, t.idempotencyKey),
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
// user_questions — spaced repetition schedule per user per question
// ---------------------------------------------------------------------------
export const userQuestions = mysqlTable(
  "user_questions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: int("questionId")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    nextReviewAt: varchar("nextReviewAt", { length: 10 }).notNull(),
    intervalDays: int("intervalDays").default(1).notNull(),
    easeFactor: real("easeFactor").default(2.5).notNull(),
    lastReviewedAt: varchar("lastReviewedAt", { length: 10 }),
    reviewCount: int("reviewCount").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    uniqueIndex("user_questions_user_question_idx").on(t.userId, t.questionId),
    index("user_questions_next_review_idx").on(t.userId, t.nextReviewAt),
  ],
);

export type UserQuestion = typeof userQuestions.$inferSelect;
export type InsertUserQuestion = typeof userQuestions.$inferInsert;

// ---------------------------------------------------------------------------
// model_answers — pre-generated exemplar answers per question + level
// ---------------------------------------------------------------------------
export const modelAnswers = mysqlTable(
  "model_answers",
  {
    id: int("id").autoincrement().primaryKey(),
    questionId: int("questionId")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    level: varchar("level", { length: 20 }).default("intermediate").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("model_answers_question_level_idx").on(t.questionId, t.level),
  ],
);

export type ModelAnswer = typeof modelAnswers.$inferSelect;
export type InsertModelAnswer = typeof modelAnswers.$inferInsert;

// ---------------------------------------------------------------------------
// follow_ups — AI-generated follow-up questions probing weak areas
// ---------------------------------------------------------------------------
export const followUps = mysqlTable(
  "follow_ups",
  {
    id: int("id").autoincrement().primaryKey(),
    parentId: int("parentId")
      .notNull(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionText: text("questionText").notNull(),
    weakAreas: json("weakAreas").$type<string[]>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    index("follow_ups_user_idx").on(t.userId),
    index("follow_ups_parent_idx").on(t.parentId),
  ],
);

export type FollowUp = typeof followUps.$inferSelect;
export type InsertFollowUp = typeof followUps.$inferInsert;

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
  "weekly_summary",
  "weekly_digest",
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

// ---------------------------------------------------------------------------
// evaluation_versions — contract-versioned V2 evaluations (build-plan §6, §0.3)
// One row per evaluation run; `result` is the canonical EvaluationContract
// payload. Legacy score/feedback columns on `answers` remain the V1 projection.
// ---------------------------------------------------------------------------
export const evaluationVersions = mysqlTable(
  "evaluation_versions",
  {
    id: int("id").autoincrement().primaryKey(),
    answerId: int("answerId")
      .notNull()
      .references(() => answers.id, { onDelete: "cascade" }),
    contractVersion: int("contractVersion").notNull(),
    evaluatorVersion: varchar("evaluatorVersion", { length: 64 }).notNull(),
    promptVersion: varchar("promptVersion", { length: 64 }).notNull(),
    rubricVersion: varchar("rubricVersion", { length: 64 }).notNull(),
    provider: varchar("provider", { length: 32 }).notNull(),
    modelVersion: varchar("modelVersion", { length: 128 }).notNull(),
    overallBand: mysqlEnum("overallBand", BANDS).notNull(),
    languageBlocked: boolean("languageBlocked").default(false).notNull(),
    result: json("result").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    index("evaluation_versions_answer_idx").on(t.answerId),
    index("evaluation_versions_answer_version_idx").on(t.answerId, t.contractVersion),
  ],
);

export type EvaluationVersion = typeof evaluationVersions.$inferSelect;
export type InsertEvaluationVersion = typeof evaluationVersions.$inferInsert;

// ---------------------------------------------------------------------------
// feature_flags — data-driven enablement per env + college (build-plan §0.5)
// `collegeId = NULL` rows are the environment-wide default; a college-specific
// row overrides it. Flags never gate V1 flows.
// ---------------------------------------------------------------------------
export const NODE_ENV_ENUM = ["development", "test", "production"] as const;

export const featureFlags = mysqlTable(
  "feature_flags",
  {
    id: int("id").autoincrement().primaryKey(),
    key: mysqlEnum("key", FEATURE_FLAGS).notNull(),
    envScope: mysqlEnum("envScope", NODE_ENV_ENUM).notNull(),
    collegeId: varchar("collegeId", { length: 64 }),
    enabled: boolean("enabled").notNull(),
    rolloutPercent: int("rolloutPercent").default(100).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    uniqueIndex("feature_flags_scope_idx").on(t.key, t.envScope, t.collegeId),
  ],
);

export type FeatureFlagRow = typeof featureFlags.$inferSelect;
export type InsertFeatureFlag = typeof featureFlags.$inferInsert;

// ---------------------------------------------------------------------------
// analytics_events — funnel telemetry (build-plan §0.6)
// Append-only. Clients batch events and drain them; the server stamps the
// authenticated userId, so client payloads never claim an identity.
// ---------------------------------------------------------------------------
export const analyticsEvents = mysqlTable(
  "analytics_events",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").references(() => users.id, { onDelete: "set null" }),
    collegeId: varchar("collegeId", { length: 64 }),
    name: mysqlEnum("name", FUNNEL_EVENTS).notNull(),
    props: json("props").$type<Record<string, unknown>>(),
    clientTs: timestamp("clientTs"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    index("analytics_events_name_created_idx").on(t.name, t.createdAt),
    index("analytics_events_user_idx").on(t.userId),
  ],
);

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;
