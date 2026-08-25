import OpenAI from "openai";
import { getEnv } from "@kairos/config";
import { AppError } from "../../lib/http";
import { getRedis, redisReady } from "../../lib/cache";
import type { AIEvalHooks, AIEvalRequest, AIEvalResult, AIProvider } from "./types";

// Extracted verbatim from the former ai.service.ts — behavior-preserving.
const EVAL_SYSTEM = `You are a senior technical interviewer at a top tech company. You evaluate candidate answers for an AI interview-prep product.

You receive:
- The interview question.
- Rubric hints: what a strong answer must cover.
- The candidate's level (beginner/intermediate/advanced).
- The candidate's answer.

Return STRICT JSON only (no markdown fences, no commentary) with exactly this shape:
{
  "score": <integer 1-10>,
  "feedback": "<2-4 sentences: what was good, what was missing, how to improve. Reference rubric hints and the candidate's level.>",
  "modelAnswer": "<a crisp, well-structured reference answer, 5-12 sentences, directly answering the question at the right depth for the candidate's level>"
}

Scoring guidance:
- 1-3: major concepts wrong or answer too vague.
- 4-6: partially correct, missing key rubric points.
- 7-8: solid answer, minor gaps.
- 9-10: comprehensive, precise, hits all rubric hints.

Use the candidate's level to calibrate depth: a beginner gets credit for covering basics cleanly; an advanced candidate is expected to cover edge cases and tradeoffs.`;

function hashKey(questionId: number, level: string): string {
  return `ai:model:${questionId}:${level}`;
}

function extractJson(text: string): unknown | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function validateResult(raw: unknown): Omit<AIEvalResult, "provider" | "modelVersion"> | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.score !== "number" || typeof r.feedback !== "string" || typeof r.modelAnswer !== "string") return null;
  const score = Math.round(r.score);
  if (score < 1 || score > 10 || r.feedback.trim().length === 0 || r.modelAnswer.trim().length === 0) return null;
  return { score, feedback: r.feedback.trim(), modelAnswer: r.modelAnswer.trim() };
}

async function fetchCachedModelAnswer(questionId: number, level: string): Promise<string | null> {
  if (!(await redisReady())) return null;
  try {
    return await getRedis()!.get(hashKey(questionId, level));
  } catch {
    return null;
  }
}

async function cacheModelAnswer(questionId: number, level: string, answer: string): Promise<void> {
  if (!(await redisReady())) return;
  try {
    const ttl = getEnv().OPENROUTER_CACHE_TTL_SEC;
    if (ttl > 0) await getRedis()!.set(hashKey(questionId, level), answer, "EX", ttl);
  } catch {
    /* cache is best-effort */
  }
}

export class OpenRouterProvider implements AIProvider {
  readonly name = "openrouter";
  readonly modelVersion: string;

  private client: OpenAI | null = null;

  constructor(private apiKey: string | undefined) {
    this.modelVersion = getEnv().OPENROUTER_MODEL;
  }

  private getClient(): OpenAI | null {
    if (!this.apiKey) return null;
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: this.apiKey,
        baseURL: "https://openrouter.ai/api/v1",
        timeout: getEnv().OPENROUTER_TIMEOUT_MS,
      });
    }
    return this.client;
  }

  async evaluate(req: AIEvalRequest, hooks?: AIEvalHooks): Promise<AIEvalResult> {
    const openai = this.getClient();
    if (!openai) {
      throw new Error("AI evaluation is not configured");
    }
    const env = getEnv();

    const cachedModel = await fetchCachedModelAnswer(req.questionId, req.level);
    const userPrompt = [
      `Question: ${req.questionText}`,
      `Rubric hints: ${req.rubricHints}`,
      `Candidate level: ${req.level}`,
      `Candidate answer: ${req.answerText}`,
    ].join("\n\n");

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: EVAL_SYSTEM },
    ];
    if (cachedModel) {
      messages.push({ role: "assistant", content: JSON.stringify({ modelAnswer: cachedModel }) });
    }
    messages.push({ role: "user", content: userPrompt });

    const stream = await openai.chat.completions.create({
      model: env.OPENROUTER_FAST_MODEL,
      messages,
      temperature: 0.2,
      stream: true,
    });

    let full = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        full += delta;
        if (hooks?.onToken) await hooks.onToken(delta);
      }
    }

    let result = validateResult(extractJson(full));

    if (!result) {
      // One non-streaming retry to recover from truncated/streamed output.
      const retry = await openai.chat.completions.create({
        model: env.OPENROUTER_MODEL,
        messages,
        temperature: 0.2,
      });
      const text = retry.choices[0]?.message?.content ?? "";
      result = validateResult(extractJson(text));
    }

    if (!result) {
      throw AppError.aiUnavailable("Could not parse the evaluation result");
    }

    await cacheModelAnswer(req.questionId, req.level, result.modelAnswer);
    return { ...result, provider: this.name, modelVersion: env.OPENROUTER_MODEL };
  }
}
