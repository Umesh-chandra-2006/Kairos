import { useCallback } from "react";
import { getToken as getLocalToken } from "@/lib/auth";
import type {
  OnboardingResponse,
  GetTodayQuestionResponse,
  SubmitAnswerResponse,
  GetAnswerHistoryResponse,
  GetStreakResponse,
  ErrorResponse,
  Question,
} from "@shared/api-types";

const BASE = "";

export function useApi() {
  const getToken = async () => getLocalToken();

  const request = useCallback(
    async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
      try {
        const token = await getToken();

        const res = await fetch(`${BASE}${path}`, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          const error = data as ErrorResponse;
          throw new Error(error.error || "API error");
        }

        return data as T;
      } catch (error) {
        console.error("API request failed:", error);
        throw error;
      }
    },
    [getToken]
  );

  return {
    completeOnboarding: (data: {
      role?: string;
      level?: string;
      targets?: string[];
      notificationTime?: string;
    }) =>
      request<OnboardingResponse>("/api/auth/onboarding", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    getTodayQuestion: () =>
      request<GetTodayQuestionResponse>("/api/question/today"),

    getPracticeQuestion: (category: string) =>
      request<{ question: Question }>(`/api/question/practice?category=${category}`),

    getQuestion: (id: number | string) =>
      request<{ question: Question }>(`/api/question/${id}`),

    submitAnswer: (data: { questionId: number | string; answerText: string }) =>
      request<SubmitAnswerResponse>("/api/answer/submit", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    getHistory: (limit: number = 50, offset: number = 0) =>
      request<GetAnswerHistoryResponse>(
        `/api/answer/history?limit=${limit}&offset=${offset}`
      ),

    getStreak: () =>
      request<GetStreakResponse>("/api/streak"),

    useFreeze: () =>
      request<GetStreakResponse>("/api/streak/freeze", {
        method: "POST",
      }),
  };
}
