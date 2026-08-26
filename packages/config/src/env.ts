import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

// When bundled for production (CommonJS output), esbuild leaves `import.meta`
// empty, so fall back to walking up from the working directory to the
// pnpm workspace root (the repo root), regardless of where the process starts.
function detectProjectRoot(): string {
  try {
    const detected = path.dirname(fileURLToPath(import.meta.url));
    return path.resolve(detected, "../../..");
  } catch {
    let dir = process.cwd();
    for (;;) {
      if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
        return dir;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }
}

const resolvedProjectRoot = detectProjectRoot();

export function getProjectRoot(): string {
  return resolvedProjectRoot;
}

// Load the monorepo-root .env before parsing. dotenv does not override
// variables that are already set in the process environment.
dotenv.config({ path: path.join(resolvedProjectRoot, ".env"), quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default("meta-llama/llama-3.1-8b-instruct:free"),
  OPENROUTER_FAST_MODEL: z.string().default("meta-llama/llama-3.1-8b-instruct:free"),
  OPENROUTER_TIMEOUT_MS: z.coerce.number().default(30_000),
  OPENROUTER_CACHE_TTL_SEC: z.coerce.number().default(86_400),
  AI_PROVIDER: z.enum(["auto", "openrouter", "mock"]).default("auto"),
  ASR_PROVIDER: z.enum(["auto", "localwhisper", "groq", "mock"]).default("auto"),
  WHISPER_MODEL: z.string().default("small"),
  GROQ_API_KEY: z.string().optional(),
  GROQ_ASR_MODEL: z.string().default("whisper-large-v3"),
  LOG_LEVEL: z.string().default("info"),
  WEB_PUSH_PUBLIC_KEY: z.string().optional(),
  WEB_PUSH_PRIVATE_KEY: z.string().optional(),
  WEB_PUSH_SUBJECT: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Kairos <onboarding@resend.dev>"),
  APP_URL: z.string().url().default("http://localhost:5173"),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(10),
  RATE_LIMIT_AI_MAX: z.coerce.number().default(10),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PRO_PRICE_ID: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_PLAN_ID: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
})
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== "production") return;
    const required: Array<[keyof Env, string]> = [
      ["REDIS_URL", "REDIS_URL is required in production (BullMQ depends on it)"],
      ["OPENROUTER_API_KEY", "OPENROUTER_API_KEY is required in production (AI evaluation)"],
      ["RESEND_API_KEY", "RESEND_API_KEY is required in production (transactional email)"],
    ];
    for (const [key, message] of required) {
      if (!data[key]) {
        ctx.addIssue({ code: "custom", path: [key as string], message });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(overrides: Record<string, unknown> = {}): Env {
  const parsed = envSchema.safeParse({ ...process.env, ...overrides });
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  cached = parsed.data;
  return parsed.data;
}

export function getEnv(): Env {
  if (!cached) cached = loadEnv();
  return cached;
}

export function corsOrigins(env: Env): string[] {
  return env.CORS_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}
