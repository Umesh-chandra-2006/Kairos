export const CATEGORIES = [
  "DSA",
  "OS",
  "DBMS",
  "Networks",
  "OOP",
  "SystemDesign",
  "Behavioral",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const USER_ROLES = ["student", "professional"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SKILL_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const ANSWER_STATUSES = ["pending", "evaluating", "completed", "failed"] as const;
export type AnswerStatus = (typeof ANSWER_STATUSES)[number];

export const ERROR_CODES = {
  VALIDATION: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL_ERROR",
  AI_UNAVAILABLE: "AI_UNAVAILABLE",
} as const;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const ANSWER_MIN_LENGTH = 20;
export const ANSWER_MAX_LENGTH = 10_000;

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ERROR_CODES.VALIDATION]: "Invalid request data",
  [ERROR_CODES.UNAUTHORIZED]: "Authentication required",
  [ERROR_CODES.FORBIDDEN]: "You do not have permission to do that",
  [ERROR_CODES.NOT_FOUND]: "Resource not found",
  [ERROR_CODES.CONFLICT]: "Request conflicts with current state",
  [ERROR_CODES.RATE_LIMITED]: "Too many requests, slow down",
  [ERROR_CODES.INTERNAL]: "Something went wrong",
  [ERROR_CODES.AI_UNAVAILABLE]: "AI evaluation is temporarily unavailable",
};
