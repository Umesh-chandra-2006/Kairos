import type { ASRWord } from "../providers/types";

/**
 * Deterministic delivery metrics (build-plan §Wave1, contract §delivery).
 *
 * These are the ONLY delivery numbers allowed in an evaluation, and they come
 * exclusively from ASR word timestamps — the LLM never measures delivery.
 * Pure functions: no I/O, fully unit-testable.
 */

const FILLER_WORDS = new Set([
  "um", "uh", "erm", "hmm",
  "like", "actually", "basically", "literally",
  "you-know", "yaar", "matlab",
]);

export interface DeliveryMetrics {
  speechRate: number; // words per minute of active speaking
  fillerRate: number; // filler words per minute of total duration
  speakingRatio: number; // active speech time / total duration (0..1]
  pauses: {
    count: number;
    totalMs: number;
    avgMs: number;
    longestMs: number;
  };
}

/** Inter-word gaps at or above this threshold count as pauses. */
export const PAUSE_THRESHOLD_MS = 700;

export function computeDeliveryMetrics(words: ASRWord[], durationMs: number): DeliveryMetrics {
  const clean = [...words].sort((a, b) => a.startMs - b.startMs);
  if (clean.length === 0 || durationMs <= 0) {
    return { speechRate: 0, fillerRate: 0, speakingRatio: 0, pauses: { count: 0, totalMs: 0, avgMs: 0, longestMs: 0 } };
  }

  let activeSpeechMs = 0;
  for (const w of clean) activeSpeechMs += Math.max(w.endMs - w.startMs, 0);
  // Clamp active speech to the audio duration (overlapping/rounded timestamps).
  activeSpeechMs = Math.min(activeSpeechMs, durationMs);

  let pauseCount = 0;
  let pauseTotalMs = 0;
  let pauseLongestMs = 0;
  for (let i = 1; i < clean.length; i++) {
    const gap = clean[i]!.startMs - clean[i - 1]!.endMs;
    if (gap >= PAUSE_THRESHOLD_MS) {
      pauseCount++;
      pauseTotalMs += gap;
      pauseLongestMs = Math.max(pauseLongestMs, gap);
    }
  }

  const minutes = durationMs / 60_000;
  const wordCount = clean.filter((w) => !FILLER_WORDS.has(w.word.toLowerCase())).length;
  const fillers = clean.filter((w) => FILLER_WORDS.has(w.word.toLowerCase())).length;

  return {
    speechRate: round(minutes > 0 ? wordCount / minutes : 0),
    fillerRate: round(minutes > 0 ? fillers / minutes : 0),
    speakingRatio: round(activeSpeechMs / durationMs),
    pauses: {
      count: pauseCount,
      totalMs: pauseTotalMs,
      avgMs: pauseCount > 0 ? Math.round(pauseTotalMs / pauseCount) : 0,
      longestMs: pauseLongestMs,
    },
  };
}

/** Maps deterministic metrics onto the contract's three-band scale. */
export function bandDelivery(m: DeliveryMetrics): "needs_work" | "solid" | "strong" {
  if (m.speechRate < 70 || m.speechRate > 210) return "needs_work";
  if (m.speakingRatio < 0.5) return "needs_work";
  if (m.fillerRate > 8) return "needs_work";

  const solid =
    (m.speechRate >= 90 && m.speechRate <= 180) &&
    m.fillerRate <= 5 &&
    m.speakingRatio >= 0.6;
  return solid ? "strong" : "solid";
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
