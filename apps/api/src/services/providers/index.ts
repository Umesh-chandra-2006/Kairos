import { getEnv, type Env } from "@kairos/config";
import { AppError } from "../../lib/http";
import { MockAIProvider, MockASRProvider } from "./mock";
import { OpenRouterProvider } from "./openrouter";
import { LocalWhisperProvider } from "./localWhisper";
import { GroqProvider } from "./groq";
import type { AIEvalRequest, AIProvider, ASRProvider, ChatJSONProvider } from "./types";

export * from "./types";
export { MockAIProvider, MockASRProvider, type MockASROpts } from "./mock";
export { OpenRouterProvider } from "./openrouter";
export { LocalWhisperProvider } from "./localWhisper";
export { GroqProvider } from "./groq";

/** Every concrete AI provider serves both V1 grading and V2 JSON completion. */
export type FullAIProvider = AIProvider & ChatJSONProvider;

/** Preserves V1 semantics when no AI provider is configured. */
export class UnavailableAIProvider implements FullAIProvider {
  readonly name = "unavailable";
  readonly modelVersion = "none";

  async evaluate(_req?: AIEvalRequest): Promise<never> {
    throw AppError.aiUnavailable("AI evaluation is not configured");
  }

  async completeJSON(): Promise<never> {
    throw AppError.aiUnavailable("AI evaluation is not configured");
  }
}

/**
 * Provider selection never happens at call sites — only here.
 * "auto" keeps legacy behavior: OpenRouter when a key exists, otherwise the
 * unavailable stub that surfaces the same error the worker already handles.
 */
export function getAIProvider(override?: string, env: Env = getEnv()): FullAIProvider {
  const choice = override ?? env.AI_PROVIDER;
  switch (choice) {
    case "mock":
      return new MockAIProvider();
    case "openrouter":
      return new OpenRouterProvider(env.OPENROUTER_API_KEY);
    case "openai":
      // Phase 1 adds a native OpenAI provider behind the same interface.
    default:
      return env.OPENROUTER_API_KEY
        ? new OpenRouterProvider(env.OPENROUTER_API_KEY)
        : new UnavailableAIProvider();
  }
}

/**
 * ASR selection (build-plan Wave 1): "auto" resolves local faster-whisper →
 * Groq fallback, mirroring the cost/reliability ladder. In test environments
 * auto resolves to the deterministic mock so CI needs neither python nor keys.
 * `probeLocal` lets callers skip the python availability probe.
 */
export async function getASRProvider(
  override?: string,
  env: Env = getEnv(),
  opts: { probeLocal?: boolean } = {},
): Promise<ASRProvider> {
  const choice = override ?? env.ASR_PROVIDER ?? "auto";

  const resolveAuto = async (): Promise<ASRProvider> => {
    if (env.NODE_ENV === "test") return new MockASRProvider();
    if (await new LocalWhisperProvider().available()) return new LocalWhisperProvider();
    if (env.GROQ_API_KEY) return new GroqProvider();
    throw AppError.aiUnavailable("No speech-to-text provider is configured");
  };

  switch (choice) {
    case "mock":
      return new MockASRProvider();
    case "localwhisper":
      return new LocalWhisperProvider();
    case "groq":
      if (!env.GROQ_API_KEY) throw AppError.aiUnavailable("Groq ASR is not configured");
      return new GroqProvider();
    case "auto":
      return opts.probeLocal === false ? Promise.resolve(new MockASRProvider()) : resolveAuto();
    default:
      throw new Error(`ASR provider "${choice}" is not implemented yet`);
  }
}
