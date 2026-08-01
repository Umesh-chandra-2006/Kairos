import EventSource from "react-native-sse";
import type {
  AnswerWithQuestion,
  HistoryResponse,
  LeaderboardResponse,
  OnboardingInput,
  PublicUser,
  QuestionListResponse,
  Streak,
  TodayQuestionResponse,
  UserRank,
} from "@kairos/shared";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveRefreshToken,
  saveTokens,
} from "./storage";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken?: string;
  user: PublicUser;
}

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Loads persisted tokens from SecureStore into memory (call once at startup). */
export async function bootstrapTokens(): Promise<void> {
  accessToken = await getAccessToken();
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device: "mobile", refreshToken }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as AuthResponse;
      accessToken = data.accessToken;
      if (data.refreshToken) await saveRefreshToken(data.refreshToken);
      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  let res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    const fresh = await refreshAccessToken();
    if (fresh) {
      headers["Authorization"] = `Bearer ${fresh}`;
      res = await fetch(`${API_URL}${path}`, {
        method: options.method ?? "GET",
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    }
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body.error?.message) message = body.error.message;
    } catch {
      /* keep default message */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  del: <T>(path: string, body?: unknown) => request<T>(path, { method: "DELETE", body }),

  // ---- Auth ----
  register: async (input: { name: string; email: string; password: string }) => {
    const res = await api.post<AuthResponse>("/api/auth/register", { ...input, device: "mobile" });
    await saveTokens(res.accessToken, res.refreshToken);
    accessToken = res.accessToken;
    return res;
  },
  login: async (input: { email: string; password: string }) => {
    const res = await api.post<AuthResponse>("/api/auth/login", { ...input, device: "mobile" });
    await saveTokens(res.accessToken, res.refreshToken);
    accessToken = res.accessToken;
    return res;
  },
  logout: async () => {
    const refreshToken = await getRefreshToken();
    try {
      await api.post<{ ok: true }>("/api/auth/logout", { device: "mobile", refreshToken });
    } finally {
      await clearTokens();
      accessToken = null;
    }
  },
  me: () => api.get<{ user: PublicUser }>("/api/auth/me"),
  onboarding: (input: OnboardingInput) => api.put<{ user: PublicUser }>("/api/auth/me/onboarding", input),
  forgotPassword: (email: string) => api.post<{ ok: true }>("/api/auth/forgot-password", { email }),
  resetPassword: (token: string, password: string) =>
    api.post<{ ok: true }>("/api/auth/reset-password", { token, password }),
  verifyEmail: (token: string) => api.post<{ ok: true }>("/api/auth/verify-email", { token }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ ok: true }>("/api/auth/change-password", { currentPassword, newPassword }),

  // ---- Questions & answers ----
  today: () => api.get<TodayQuestionResponse>("/api/questions/today"),
  questions: (params?: { category?: string; difficulty?: string; cursor?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set("category", params.category);
    if (params?.difficulty) qs.set("difficulty", params.difficulty);
    if (params?.cursor) qs.set("cursor", String(params.cursor));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString();
    return api.get<QuestionListResponse>(`/api/questions${query ? `?${query}` : ""}`);
  },
  submitAnswer: (questionId: number, answerText: string) =>
    api.post<{ answerId: number }>("/api/answers/submit", { questionId, answerText }),
  answer: (id: number) => api.get<{ answer: AnswerWithQuestion }>(`/api/answers/${id}`),
  history: (cursor?: number, limit = 20) => {
    const qs = new URLSearchParams();
    if (cursor) qs.set("cursor", String(cursor));
    qs.set("limit", String(limit));
    return api.get<HistoryResponse>(`/api/answers?${qs.toString()}`);
  },
  answerStreamUrl: (answerId: number) =>
    `${API_URL}/api/answers/${answerId}/stream?token=${encodeURIComponent(accessToken ?? "")}`,

  // ---- Streak ----
  streak: () => api.get<{ streak: Streak & { rank: number | null } }>("/api/streak"),
  refillFreezes: () => api.post<{ streak: Streak }>("/api/streak/refill"),

  // ---- Leaderboard ----
  leaderboard: () => api.get<LeaderboardResponse>("/api/leaderboard"),
  myRank: () => api.get<UserRank>("/api/leaderboard/me/rank"),
};

/** Consumes the answer SSE stream (react-native-sse), invoking handlers per event type. */
export function connectAnswerStream(
  answerId: number,
  handlers: {
    onStatus?: (status: string) => void;
    onToken?: (delta: string) => void;
    onDone?: (data: { score: number; feedback: string; modelAnswer: string; streak: { current: number; longest: number } | null }) => void;
    onError?: (message: string) => void;
  },
): () => void {
  const url = api.answerStreamUrl(answerId);
  const es = new EventSource(url);

  es.addEventListener("message", (event) => {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(event.data ?? "") as Record<string, unknown>;
    } catch {
      return;
    }
    switch (data.type) {
      case "status":
        handlers.onStatus?.(String(data.status ?? ""));
        break;
      case "token":
        handlers.onToken?.(String(data.delta ?? ""));
        break;
      case "done":
        handlers.onDone?.({
          score: Number(data.score),
          feedback: String(data.feedback ?? ""),
          modelAnswer: String(data.modelAnswer ?? ""),
          streak: data.streak ? (data.streak as { current: number; longest: number }) : null,
        });
        es.close();
        break;
      case "error":
        handlers.onError?.(String(data.message ?? "Evaluation failed"));
        es.close();
        break;
    }
  });

  es.addEventListener("error", (event) => {
    const msg = "type" in event && event.type === "error" && "message" in event ? event.message : "Connection to evaluation stream lost";
    handlers.onError?.(String(msg));
    es.close();
  });

  return () => es.close();
}
