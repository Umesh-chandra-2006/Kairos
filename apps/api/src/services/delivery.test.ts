import { describe, expect, it } from "vitest";
import { bandDelivery, computeDeliveryMetrics } from "./delivery";
import type { ASRWord } from "./providers/types";

function words(startMs: number, per: number, text: string[]): ASRWord[] {
  return text.map((w, i) => ({ word: w, startMs: startMs + i * per, endMs: startMs + (i + 1) * per - 20, confidence: 0.95 }));
}

describe("computeDeliveryMetrics", () => {
  it("returns zeros for empty input", () => {
    const m = computeDeliveryMetrics([], 60_000);
    expect(m.speechRate).toBe(0);
    expect(m.pauses.count).toBe(0);
    expect(bandDelivery(m)).toBe("needs_work");
  });

  it("counts pauses only above the 700ms threshold", () => {
    // 6 words at 200ms each; one 900ms gap and one 500ms gap.
    const ws = words(1000, 200, ["a", "b", "c", "d", "e", "f"]);
    ws[3]!.startMs += 900; // big gap before word d
    const lastGap = 500;
    for (let i = 5; i < ws.length; i++) ws[i]!.startMs += lastGap;
    const duration = ws.at(-1)!.endMs + 500;

    const m = computeDeliveryMetrics(ws, duration);
    expect(m.pauses.count).toBe(1);
    expect(m.pauses.longestMs).toBeGreaterThanOrEqual(700);
  });

  it("separates filler words from the speech-rate numerator", () => {
    const text = ["basically", "the", "index", "works", "like", "a", "map", "um"];
    const totalMs = 60_000; // spread across a full minute
    const ws = text.map((w, i) => ({
      word: w,
      startMs: i * (totalMs / text.length),
      endMs: (i + 1) * (totalMs / text.length) - 50,
      confidence: 1,
    }));
    const m = computeDeliveryMetrics(ws, totalMs);
    // 8 words, 3 fillers → rate uses 5 content words / minute.
    expect(m.speechRate).toBe(5);
    expect(m.fillerRate).toBe(3);
  });
});

describe("bandDelivery thresholds", () => {
  it("strong pace, low fillers, high speaking ratio", () => {
    const m = { speechRate: 130, fillerRate: 2, speakingRatio: 0.85, pauses: { count: 2, totalMs: 2400, avgMs: 1200, longestMs: 1400 } };
    expect(bandDelivery(m)).toBe("strong");
  });

  it("flags extreme speech rates as needs_work", () => {
    expect(bandDelivery({ ...{ speechRate: 40, fillerRate: 1, speakingRatio: 0.9, pauses: { count: 0, totalMs: 0, avgMs: 0, longestMs: 0 } } })).toBe("needs_work");
    expect(bandDelivery({ speechRate: 260, fillerRate: 1, speakingRatio: 0.9, pauses: { count: 0, totalMs: 0, avgMs: 0, longestMs: 0 } })).toBe("needs_work");
  });

  it("flags heavy filler usage as needs_work", () => {
    expect(bandDelivery({ speechRate: 120, fillerRate: 10, speakingRatio: 0.9, pauses: { count: 0, totalMs: 0, avgMs: 0, longestMs: 0 } })).toBe("needs_work");
  });

  it("mid-range metrics land on solid", () => {
    expect(bandDelivery({ speechRate: 82, fillerRate: 6, speakingRatio: 0.55, pauses: { count: 1, totalMs: 800, avgMs: 800, longestMs: 800 } })).toBe("solid");
  });
});
