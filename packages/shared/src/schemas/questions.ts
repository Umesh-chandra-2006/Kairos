import { z } from "zod";
import { CATEGORIES, DIFFICULTIES } from "../constants";

export const questionSchema = z.object({
  id: z.number().int(),
  category: z.enum(CATEGORIES),
  difficulty: z.enum(DIFFICULTIES),
  text: z.string(),
  rubricHints: z.string(),
});

export const questionFiltersSchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const questionListResponseSchema = z.object({
  questions: z.array(questionSchema),
  nextCursor: z.number().int().nullable(),
});

export const todayQuestionResponseSchema = z.object({
  question: questionSchema.nullable(),
  alreadyAnswered: z.boolean(),
  answerId: z.number().int().optional(),
});

export const practiceQuerySchema = z.object({
  category: z.enum(CATEGORIES).optional(),
});

export type Question = z.infer<typeof questionSchema>;
export type QuestionFilters = z.infer<typeof questionFiltersSchema>;
export type QuestionListResponse = z.infer<typeof questionListResponseSchema>;
export type TodayQuestionResponse = z.infer<typeof todayQuestionResponseSchema>;
export type PracticeQuery = z.infer<typeof practiceQuerySchema>;
