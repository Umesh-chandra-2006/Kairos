import { describe, expect, it } from "vitest";
import { ERROR_CODES, type ErrorCode } from "@kairos/shared";
import type { Env } from "@kairos/config";
import {
  getAIProvider,
  getASRProvider,
  MockAIProvider,
  MockASRProvider,
  OpenRouterProvider,
  UnavailableAIProvider,
} from "./index";

const baseReq = {
  questionId: 1,
  questionText: "What is a database index?",
  rubricHints: "b-tree structure; write penalty; optimizer skipping",
  level: "intermediate",
  answerText:
    "An index is a data structure, usually a b-tree, that lets the database find rows without scanning the whole table. The write penalty trade-off matters.",
};

function fakeEnv(partial: {
  NODE_ENV?: string;
  AI_PROVIDER?: string;
  ASR_PROVIDER?: string;
  OPENROUTER_API_KEY?: string;
}): Env {
  return partial as unknown as Env;
}

describe("MockAIProvider", () => {
  it("is deterministic for identical input", async () => {
    const p = new MockAIProvider();
    const a = await p.evaluate(baseReq);
    const b = await p.evaluate(baseReq);
    expect(b).toEqual(a);
  });

  it("returns V1-shaped results with provenance", async () => {
    const res = await new MockAIProvider().evaluate(baseReq);
    expect(Number.isInteger(res.score)).toBe(true);
    expect(res.score).toBeGreaterThanOrEqual(1);
    expect(res.score).toBeLessThanOrEqual(10);
    expect(res.feedback.length).toBeGreaterThan(0);
    expect(res.modelAnswer.length).toBeGreaterThan(0);
    expect(res.provider).toBe("mock-ai");
    expect(res.modelVersion).toBe("mock-1");
  });

  it("keeps scores in range across varied answers", async () => {
    const p = new MockAIProvider();
    const variants = [
      "",
      "x",
      baseReq.answerText,
      baseReq.answerText.repeat(20),
      "completely unrelated rambling about cooking pasta",
    ];
    for (const answerText of variants) {
      const res = await p.evaluate({ ...baseReq, answerText });
      expect(res.score).toBeGreaterThanOrEqual(1);
      expect(res.score).toBeLessThanOrEqual(10);
    }
  });

  it("streams the full payload through onToken", async () => {
    const p = new MockAIProvider();
    let collected = "";
    const res = await p.evaluate(baseReq, {
      onToken: async (delta) => {
        collected += delta;
      },
    });
    const parsed = JSON.parse(collected) as { score: number };
    expect(parsed.score).toBe(res.score);
  });
});

describe("getAIProvider factory", () => {
  it("explicit mock wins over everything", () => {
    expect(getAIProvider("mock", fakeEnv({ AI_PROVIDER: "openrouter", OPENROUTER_API_KEY: "k" }))).toBeInstanceOf(
      MockAIProvider,
    );
  });

  it("auto without key yields the unavailable stub preserving V1 semantics", () => {
    expect(getAIProvider("auto", fakeEnv({ AI_PROVIDER: "auto" }))).toBeInstanceOf(UnavailableAIProvider);
  });

  it("auto with key selects openrouter", () => {
    expect(
      getAIProvider("auto", fakeEnv({ AI_PROVIDER: "auto", OPENROUTER_API_KEY: "test-key" })),
    ).toBeInstanceOf(OpenRouterProvider);
  });

  it("unavailable provider throws the legacy ai_unavailable error", async () => {
    await expect(new UnavailableAIProvider().evaluate(baseReq)).rejects.toMatchObject({
      code: ERROR_CODES.AI_UNAVAILABLE satisfies ErrorCode,
    });
  });
});

describe("MockASRProvider", () => {
  it("is deterministic and honors a custom transcript", async () => {
    const p = new MockASRProvider();
    const opts = { transcript: "alpha beta gamma delta epsilon", durationMs: 10_000 };
    const a = await p.transcribe(Buffer.alloc(1024), "audio/webm", opts);
    const b = await p.transcribe(Buffer.alloc(1024), "audio/webm", opts);
    expect(b.words).toEqual(a.words);

    expect(a.words.map((w) => w.word)).toEqual(["alpha", "beta", "gamma", "delta", "epsilon"]);
    expect(a.segments.reduce((n, s) => n + s.text.split(/\s+/).length, 0)).toBe(a.words.length);
  });

  it("produces monotonic, non-overlapping timestamps with valid confidences", async () => {
    const res = await new MockASRProvider().transcribe(Buffer.alloc(64_000), "audio/wav");
    let prevEnd = -1;
    for (const w of res.words) {
      expect(w.startMs).toBeGreaterThanOrEqual(prevEnd);
      expect(w.endMs).toBeGreaterThan(w.startMs);
      expect(w.confidence).toBeGreaterThan(0);
      expect(w.confidence).toBeLessThanOrEqual(1);
      prevEnd = w.endMs;
    }
    expect(res.durationMs).toBeGreaterThanOrEqual(prevEnd);
    expect(res.provider).toBe("mock-asr");
  });

  it("factory resolves test-env auto and explicit mock to MockASRProvider", async () => {
    expect(await getASRProvider(undefined, fakeEnv({ NODE_ENV: "test" }))).toBeInstanceOf(MockASRProvider);
    expect(await getASRProvider("mock")).toBeInstanceOf(MockASRProvider);
    await expect(getASRProvider("groq", fakeEnv({ NODE_ENV: "development" }))).rejects.toMatchObject({
      code: ERROR_CODES.AI_UNAVAILABLE,
    });
    await expect(getASRProvider("nonsense", fakeEnv({ NODE_ENV: "development" }))).rejects.toThrow(/not implemented yet/);
  });
});
