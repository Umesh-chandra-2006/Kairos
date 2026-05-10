import { z } from "zod";

// Auth validations
export const loginSchema = z.object({
  email: z.string().email("invalid email"),
  password: z.string().min(6, "password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(1, "name is required"),
  email: z.string().email("invalid email"),
  password: z.string().min(6, "password must be at least 6 characters"),
});

export const onboardingSchema = z.object({
  role: z.enum(["student", "professional"]).optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  targets: z.array(z.string()).optional().default([]),
  notificationTime: z.string().regex(/^\d{2}:\d{2}$/, "invalid time format").optional(),
});

// Question validations
export const getTodayQuestionSchema = z.object({
  // GET request - no body validation needed
});

// Answer validations
export const submitAnswerSchema = z.object({
  questionId: z.string().min(1, "questionId is required").or(z.number().positive()),
  answerText: z.string()
    .min(20, "answer must be at least 20 characters")
    .max(10000, "answer must not exceed 10000 characters"),
});

export const getAnswerHistorySchema = z.object({
  limit: z.coerce.number().positive().default(50),
  offset: z.coerce.number().nonnegative().default(0),
});

// Claude evaluation response validation
export const evaluationResponseSchema = z.object({
  score: z.number().int().min(1).max(10),
  feedback: z.string().min(1),
  modelAnswer: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
export type EvaluationResponse = z.infer<typeof evaluationResponseSchema>;
