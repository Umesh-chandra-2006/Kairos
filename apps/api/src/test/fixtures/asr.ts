import type { ASRWord } from "../../services/providers/types";

/** Deterministic ASR word fixtures for delivery-metric and evaluator tests. */
export function words(startMs: number, per: number, text: string[]): ASRWord[] {
  return text.map((w, i) => ({
    word: w,
    startMs: startMs + i * per,
    endMs: startMs + (i + 1) * per - 20,
    confidence: 0.95,
  }));
}
