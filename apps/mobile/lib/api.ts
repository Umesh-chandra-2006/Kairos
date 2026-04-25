import { useAuth } from "@clerk/clerk-expo";

const BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

// Token getter — injected at call site via useAuth hook
let _tokenGetter: (() => Promise<string | null>) | null = null;

export function setTokenGetter(getter: () => Promise<string | null>) {
  _tokenGetter = getter;
}

async function request<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = _tokenGetter ? await _tokenGetter() : null;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export interface UserProfile {
  role: "student" | "professional" | null;
  level: "beginner" | "intermediate" | "advanced" | null;
  targets: string[];
  notificationTime: string;
}

export interface User {
  _id: string;
  clerkId: string;
  name: string;
  email: string;
  profile: UserProfile;
}

export interface Question {
  _id: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  text: string;
}

export interface Answer {
  _id: string;
  userId: string;
  questionId: string | Question;
  date: string;
  answerText: string;
  score: number;
  feedback: string;
  modelAnswer: string;
  createdAt: string;
}

export interface StreakInfo {
  current: number;
  longest: number;
  lastActiveDate: string;
  freezesRemaining: number;
}

export interface SubmitResult {
  score: number;
  feedback: string;
  modelAnswer: string;
  answerId: string;
  streak: { current: number; longest: number };
}

export const api = {
  syncUser: (data: { clerkId: string; name: string; email: string }) =>
    request<{ user: User }>("/api/auth/sync", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  completeOnboarding: (data: {
    role: string;
    level: string;
    targets: string[];
    notificationTime: string;
  }) =>
    request<{ user: User }>("/api/auth/onboarding", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getTodayQuestion: () =>
    request<{ question: Question; answer?: Answer; alreadyAnswered: boolean }>(
      "/api/question/today"
    ),

  submitAnswer: (data: { questionId: string; answerText: string }) =>
    request<SubmitResult>("/api/answer/submit", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getHistory: () =>
    request<{ answers: Array<{ answer: Answer; question: Question } | Answer> }>(
      "/api/answer/history"
    ),

  getStreak: () => request<StreakInfo>("/api/streak"),

  useFreeze: () =>
    request<{ streak: StreakInfo }>("/api/streak/freeze", { method: "POST" }),
};
