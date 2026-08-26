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

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: { path: (string | number)[]; message: string }[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresIn: number;
  user: PublicUser;
}

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

let sessionPromise: Promise<AuthResponse | null> | null = null;

/**
 * Restores the session on app boot using the HttpOnly refresh cookie.
 * The /api/auth/session endpoint never 401s (it returns { user: null } when
 * logged out), so a fresh page load produces no console errors. Single-flighted
 * so React StrictMode's double-invoked effect results in a single request.
 */
export async function restoreSession(): Promise<AuthResponse | null> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "include" });
        if (!res.ok) return null;
        const data = (await res.json()) as {
          user: PublicUser | null;
          accessToken?: string;
          accessTokenExpiresIn?: number;
        };
        if (!data.user || !data.accessToken) return null;
        accessToken = data.accessToken;
        return {
          accessToken: data.accessToken,
          accessTokenExpiresIn: data.accessTokenExpiresIn ?? 0,
          user: data.user,
        };
      } catch {
        return null;
      } finally {
        sessionPromise = null;
      }
    })();
  }
  return sessionPromise;
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device: "web" }),
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = (await res.json()) as AuthResponse;
      accessToken = data.accessToken;
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
  /** Raw payload (e.g. recorded audio blob) sent as-is with `contentType`. */
  rawBody?: Blob;
  contentType?: string;
}

/** Auth endpoints that must never trigger a token refresh (would loop or mask the real error). */
const NO_REFRESH_PATHS = ["/api/auth/refresh", "/api/auth/login", "/api/auth/register", "/api/auth/logout"];

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.rawBody !== undefined) headers["Content-Type"] = options.contentType ?? "application/octet-stream";
  else if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const payload: BodyInit | undefined =
    options.rawBody !== undefined ? options.rawBody : options.body !== undefined ? JSON.stringify(options.body) : undefined;

  let res: Response;
  try {
    res = await fetch(path, {
      method: options.method ?? "GET",
      headers,
      credentials: "include",
      body: payload,
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
  }

  if (res.status === 401 && !NO_REFRESH_PATHS.some((p) => path.startsWith(p))) {
    const fresh = await refreshAccessToken();
    if (fresh) {
      headers["Authorization"] = `Bearer ${fresh}`;
      try {
        res = await fetch(path, {
          method: options.method ?? "GET",
          headers,
          credentials: "include",
          body: payload,
        });
      } catch {
        throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
      }
    }
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let details: ApiError["details"];
    try {
      const body = (await res.json()) as {
        error?: {
          message?: string;
          details?: { path?: (string | number)[]; message?: string }[];
        };
      };
      if (body.error?.message) message = body.error.message;
      details = body.error?.details?.map((d) => ({ path: d.path ?? [], message: d.message ?? "" }));
    } catch {
      /* keep default message */
    }
    throw new ApiError(res.status, message, details);
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
  register: (input: { name: string; email: string; password: string }) =>
    api.post<AuthResponse>("/api/auth/register", { ...input, device: "web" }),
  login: (input: { email: string; password: string }) =>
    api.post<AuthResponse>("/api/auth/login", { ...input, device: "web" }),
  logout: () => api.post<{ ok: true }>("/api/auth/logout", { device: "web" }),
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
  practice: (category?: string) => {
    const qs = new URLSearchParams();
    if (category) qs.set("category", category);
    const query = qs.toString();
    return api.get<{ question: import("@kairos/shared").Question }>(
      `/api/questions/practice${query ? `?${query}` : ""}`,
    );
  },
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
  submitPractice: (questionId: number, answerText: string) =>
    api.post<{ answerId: number }>("/api/answers/practice", { questionId, answerText }),
  answer: (id: number) => api.get<{ answer: AnswerWithQuestion }>(`/api/answers/${id}`),
  followUps: (answerId: number) =>
    api.get<{ followUps: { id: number; questionText: string; weakAreas: string[] }[] }>(`/api/answers/${answerId}/follow-up`),
  history: (cursor?: number, limit = 20) => {
    const qs = new URLSearchParams();
    if (cursor) qs.set("cursor", String(cursor));
    qs.set("limit", String(limit));
    return api.get<HistoryResponse>(`/api/answers?${qs.toString()}`);
  },
  weeklySummary: () =>
    api.get<{ summary: { weekStart: string; weekEnd: string; answered: number; avgScore: number | null; weakestCategory: string | null } }>(
      "/api/answers/weekly-summary",
    ),
  answerStreamUrl: (answerId: number) => `/api/answers/${answerId}/stream?token=${encodeURIComponent(accessToken ?? "")}`,

  // ---- Voice submissions (V2) ----
  flags: () => api.get<{ flags: Record<string, boolean> }>("/api/flags"),
  submitVoice: (questionId: number, idempotencyKey: string, audio: Blob, clientDurationMs?: number) => {
    const qs = new URLSearchParams({ questionId: String(questionId), idempotencyKey });
    if (clientDurationMs && clientDurationMs > 0) qs.set("clientDurationMs", String(Math.round(clientDurationMs)));
    return request<VoiceSubmitResponse>(`/api/submissions/voice?${qs.toString()}`, {
      method: "POST",
      rawBody: audio,
      contentType: audio.type || "audio/webm",
    });
  },
  voiceEvaluation: (submissionId: number) =>
    api.get<VoiceEvaluationResponse>(`/api/submissions/${submissionId}/evaluation`),
  evaluationStreamUrl: (submissionId: number) =>
    `/api/evaluations/${submissionId}/stream?token=${encodeURIComponent(accessToken ?? "")}`,

  // ---- Streak ----
  streak: () => api.get<{ streak: Streak & { rank: number | null } }>("/api/streak"),
  refillFreezes: () => api.post<{ streak: Streak }>("/api/streak/refill"),

  // ---- Leaderboard ----
  leaderboard: () => api.get<LeaderboardResponse>("/api/leaderboard"),
  myRank: () => api.get<UserRank>("/api/leaderboard/me/rank"),

  // ---- Push notifications ----
  vapidPublicKey: () => api.get<{ publicKey: string | null }>("/api/notifications/vapid-public-key"),
  pushSubscriptions: () =>
    api.get<{ subscriptions: { channel: string; token: string; createdAt: string }[] }>("/api/notifications/subscriptions"),
  subscribePush: (subscription: { token: string; keys: { p256dh: string; auth: string } }) =>
    api.post<{ ok: true }>("/api/notifications/push-subscriptions", { channel: "web", ...subscription }),
  unsubscribePush: (token: string) => api.del<{ ok: true }>("/api/notifications/push-subscriptions", { token }),

  // ---- Billing ----
  getPlans: () => api.get<{ plans: { id: string; name: string; price: number; currency?: string; interval: string; features: string[] }[]; currentPlan: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean }>("/api/billing/plans"),
  createCheckout: () => api.post<{ subscriptionId: string; shortUrl: string }>("/api/billing/checkout"),
  cancelPlan: () => api.post<{ ok: true; plan: string }>("/api/billing/cancel"),

  // ---- Account / GDPR ----
  accountExport: () => api.get<{ exportedAt: string; user: Record<string, unknown> }>("/api/account/export"),
  accountDelete: (confirm: string) => api.post<{ message: string }>("/api/account/delete", { confirm }),
  accountConsent: (consentType: string, granted: boolean) => api.post<{ ok: true }>("/api/account/consent", { consentType, granted }),
  accountStats: () => api.get<{ memberSince: string; totalAnswers: number; currentStreak: number; longestStreak: number }>("/api/account/stats"),
};

/** Converts a base64url VAPID key into a Uint8Array for pushManager.subscribe. */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64url = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64url);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/** Best-effort cleanup of the current browser's web push subscription on logout. */
export async function unregisterWebPush(): Promise<void> {
  try {
    const { subscriptions } = await api.pushSubscriptions();
    const web = subscriptions.filter((s) => s.channel === "web");
    await Promise.all(web.map((s) => api.unsubscribePush(s.token)));
  } catch {
    /* best effort */
  }
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      await reg?.unregister();
    }
  } catch {
    /* best effort */
  }
}

/** Consumes the answer SSE stream, invoking callbacks per event type. */
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
  es.onmessage = (event) => {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(event.data) as Record<string, unknown>;
    } catch {
      return;
    }
    switch (data.type) {
      case "status":
        handlers.onStatus?.(String(data.status));
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
  };
  es.onerror = () => {
    handlers.onError?.("Connection to evaluation stream lost");
    es.close();
  };
  return () => es.close();
}

export interface EvalResultData {
  score: number;
  feedback: string;
  modelAnswer: string;
  streak: { current: number; longest: number } | null;
}

export interface VoiceSubmitResponse {
  submissionId: number;
  status: string;
  streamUrl: string;
}

export interface VoiceEvaluationResponse {
  status: string;
  transcript: string | null;
  durationMs: number | null;
  languageBlocked: boolean;
  errorMessage: string | null;
  evaluation: import("@kairos/shared").EvaluationResult | null;
}

export type VoiceStage = "queued" | "transcribing" | "evaluating";

/** Consumes the V2 submission SSE stream for live stage updates. */
function connectVoiceStream(
  submissionId: number,
  handlers: { onStage?: (stage: VoiceStage) => void; onError?: (message: string) => void },
): () => void {
  const es = new EventSource(api.evaluationStreamUrl(submissionId));
  es.onmessage = (event) => {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(event.data) as Record<string, unknown>;
    } catch {
      return;
    }
    if (data.type === "voice_status") handlers.onStage?.(String(data.stage) as VoiceStage);
    if (data.type === "error") {
      handlers.onError?.(String(data.message ?? "Evaluation failed"));
      es.close();
    }
  };
  es.onerror = () => es.close(); /* SSE is optional — polling is authoritative */
  return () => es.close();
}

/**
 * Reliable result delivery for a voice submission. Polls
 * GET /api/submissions/:id/evaluation as the source of truth and layers the
 * SSE stage stream on top purely for progress feedback.
 */
export function watchVoiceEvaluation(
  submissionId: number,
  handlers: {
    onStage?: (stage: VoiceStage) => void;
    onDone: (data: VoiceEvaluationResponse) => void;
    onError: (message: string) => void;
  },
): () => void {
  let cancelled = false;
  let finished = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  let closeSse: (() => void) | null = null;

  const finish = () => {
    if (finished) return;
    finished = true;
    closeSse?.();
    if (timer) clearInterval(timer);
  };

  const poll = async () => {
    try {
      const data = await api.voiceEvaluation(submissionId);
      if (cancelled || finished) return;
      if (data.status === "completed") {
        finish();
        handlers.onDone(data);
      } else if (data.status === "failed") {
        finish();
        handlers.onError(data.errorMessage ?? "Evaluation failed");
      }
    } catch {
      /* transient network error — keep polling */
    }
  };

  timer = setInterval(poll, 1500);
  void poll();

  closeSse = connectVoiceStream(submissionId, {
    onStage: (stage) => {
      if (!cancelled && !finished) handlers.onStage?.(stage);
    },
    onError: (message) => {
      if (!cancelled && !finished) {
        finish();
        handlers.onError(message);
      }
    },
  });

  return () => {
    cancelled = true;
    finish();
  };
}


/**
 * Reliable result delivery for a submitted answer. Polls GET /api/answers/:id
 * as the source of truth so the result ALWAYS resolves, and layers the SSE
 * token stream on top purely for live token feedback. SSE failures (e.g. a
 * dropped connection) are ignored — they never block the outcome.
 */
export function watchAnswerResult(
  answerId: number,
  handlers: {
    onToken?: (delta: string) => void;
    onDone: (data: EvalResultData) => void;
    onError: (message: string) => void;
  },
): () => void {
  let cancelled = false;
  let finished = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  let closeSse: (() => void) | null = null;

  const finish = () => {
    if (finished) return;
    finished = true;
    closeSse?.();
    if (timer) clearInterval(timer);
  };

  const poll = async () => {
    try {
      const { answer } = await api.answer(answerId);
      if (cancelled || finished) return;
      if (answer.status === "completed") {
        finish();
        handlers.onDone({
          score: answer.score!,
          feedback: answer.feedback ?? "",
          modelAnswer: answer.modelAnswer ?? "",
          streak: null,
        });
      } else if (answer.status === "failed") {
        finish();
        handlers.onError(answer.errorMessage ?? "Evaluation failed");
      }
    } catch {
      /* transient network error — keep polling */
    }
  };

  timer = setInterval(poll, 1500);
  void poll();

  closeSse = connectAnswerStream(answerId, {
    onToken: (delta) => {
      if (!cancelled && !finished) handlers.onToken?.(delta);
    },
    onDone: (data) => {
      if (!cancelled && !finished) {
        finish();
        handlers.onDone(data);
      }
    },
    onError: () => {
      /* SSE is optional — polling is authoritative */
    },
  });

  return () => {
    cancelled = true;
    finish();
  };
}
