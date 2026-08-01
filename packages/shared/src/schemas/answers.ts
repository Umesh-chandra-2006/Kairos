import { z } from "zod";
import { ANSWER_STATUSES } from "../constants";
import { questionSchema } from "./questions";

export const submitAnswerSchema = z.object({
  questionId: z.number().int().positive(),
  answerText: z
    .string()
    .trim()
    .min(20, "Answer must be at least 20 characters")
    .max(10_000, "Answer is too long"),
});

export const answerSchema = z.object({
  id: z.number().int(),
  questionId: z.number().int(),
  date: z.string(),
  answerText: z.string(),
  score: z.number().int().min(1).max(10).nullable(),
  feedback: z.string().nullable(),
  modelAnswer: z.string().nullable(),
  status: z.enum(ANSWER_STATUSES),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const answerWithQuestionSchema = answerSchema.extend({
  question: questionSchema,
});

export const answerDetailResponseSchema = z.object({
  answer: answerWithQuestionSchema,
});

export const historyQuerySchema = z.object({
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const historyResponseSchema = z.object({
  answers: z.array(answerWithQuestionSchema),
  nextCursor: z.number().int().nullable(),
});

export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
export type Answer = z.infer<typeof answerSchema>;
export type AnswerWithQuestion = z.infer<typeof answerWithQuestionSchema>;
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
export type HistoryResponse = z.infer<typeof historyResponseSchema>;
