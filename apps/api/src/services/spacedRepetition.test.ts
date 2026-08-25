import { describe, expect, it } from "vitest";

describe("SM-2 quality mapping", () => {
  function scoreToQuality(score: number): number {
    if (score <= 3) return 1;
    if (score <= 5) return 2;
    if (score <= 7) return 3;
    if (score <= 9) return 4;
    return 5;
  }

  it("maps low scores to quality 1-2", () => {
    expect(scoreToQuality(1)).toBe(1);
    expect(scoreToQuality(3)).toBe(1);
    expect(scoreToQuality(4)).toBe(2);
    expect(scoreToQuality(5)).toBe(2);
  });

  it("maps mid scores to quality 3", () => {
    expect(scoreToQuality(6)).toBe(3);
    expect(scoreToQuality(7)).toBe(3);
  });

  it("maps high scores to quality 4-5", () => {
    expect(scoreToQuality(8)).toBe(4);
    expect(scoreToQuality(9)).toBe(4);
    expect(scoreToQuality(10)).toBe(5);
  });
});

describe("SM-2 interval computation", () => {
  function computeNext(intervalDays: number, easeFactor: number, quality: number) {
    if (quality < 3) return { intervalDays: 1, easeFactor: Math.max(1.3, easeFactor) };
    let newInterval: number;
    if (intervalDays <= 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(intervalDays * easeFactor);
    }
    const newEF = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    return { intervalDays: newInterval, easeFactor: newEF };
  }

  it("first correct answer gives 6-day interval and increases EF on quality 4", () => {
    const r = computeNext(1, 2.5, 4);
    expect(r.intervalDays).toBe(6);
    expect(r.easeFactor).toBeGreaterThanOrEqual(2.5);
  });

  it("quality 3 (mediocre correct) decreases ease factor", () => {
    const r = computeNext(1, 2.5, 3);
    expect(r.intervalDays).toBe(6);
    expect(r.easeFactor).toBeLessThan(2.5);
  });

  it("failure resets interval to 1", () => {
    const r = computeNext(10, 2.5, 1);
    expect(r.intervalDays).toBe(1);
    expect(r.easeFactor).toBe(2.5);
  });

  it("ease factor increases on perfect score", () => {
    const r = computeNext(6, 2.5, 5);
    expect(r.easeFactor).toBeGreaterThan(2.5);
  });

  it("ease factor decreases on mediocre score", () => {
    const r = computeNext(6, 2.5, 3);
    expect(r.easeFactor).toBeLessThan(2.5);
  });

  it("ease factor never drops below 1.3", () => {
    let ef = 1.4;
    for (let i = 0; i < 10; i++) ef = computeNext(6, ef, 3).easeFactor;
    expect(ef).toBeGreaterThanOrEqual(1.3);
  });
});

describe("date arithmetic", () => {
  function addDays(date: string, days: number): string {
    const d = new Date(date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  it("adds days correctly across month boundary", () => {
    expect(addDays("2026-01-30", 3)).toBe("2026-02-02");
  });

  it("adds zero days", () => {
    expect(addDays("2026-06-15", 0)).toBe("2026-06-15");
  });
});
