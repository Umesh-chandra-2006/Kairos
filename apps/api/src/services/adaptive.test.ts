import { describe, expect, it } from "vitest";
import type { Question } from "@kairos/shared";
import { computeSkillProfile, pickAdaptiveQuestion, type SkillProfile } from "./adaptive";

function fakeQuestion(overrides: Partial<Question> & { id: number }): Question {
  return {
    category: "DSA",
    difficulty: "medium",
    text: `What is ${overrides.id}?`,
    rubricHints: "Think clearly",
    ...overrides,
  };
}

const EMPTY: SkillProfile = { overallAvg: 0, categories: {}, weakestCategory: null, totalAnswers: 0 };

const DSAPool: Question[] = [
  fakeQuestion({ id: 1, category: "DSA", difficulty: "easy" }),
  fakeQuestion({ id: 2, category: "DSA", difficulty: "medium" }),
  fakeQuestion({ id: 3, category: "DSA", difficulty: "hard" }),
  fakeQuestion({ id: 4, category: "OS", difficulty: "easy" }),
  fakeQuestion({ id: 5, category: "OS", difficulty: "medium" }),
  fakeQuestion({ id: 6, category: "OS", difficulty: "hard" }),
];

describe("pickAdaptiveQuestion", () => {
  it("returns medium when no history and no category", () => {
    const q = pickAdaptiveQuestion(DSAPool, EMPTY);
    expect(["medium"]).toContain(q.difficulty);
  });

  it("picks easy difficulty for a struggling user in a specific category", () => {
    const profile: SkillProfile = {
      overallAvg: 3,
      categories: {
        DSA: { avg: 3, recentAvg: 3, count: 5, trend: "stable" },
      },
      weakestCategory: "DSA",
      totalAnswers: 5,
    };
    const q = pickAdaptiveQuestion(DSAPool, profile, "DSA", 42);
    expect(q.difficulty).toBe("easy");
    expect(q.category).toBe("DSA");
  });

  it("picks hard difficulty for a strong user", () => {
    const profile: SkillProfile = {
      overallAvg: 9,
      categories: {
        DSA: { avg: 9, recentAvg: 9, count: 10, trend: "stable" },
      },
      weakestCategory: "OS",
      totalAnswers: 10,
    };
    const q = pickAdaptiveQuestion(DSAPool, profile, "DSA", 42);
    expect(q.difficulty).toBe("hard");
    expect(q.category).toBe("DSA");
  });

  it("falls back to any question when preferred bucket is empty", () => {
    const onlyEasy: Question[] = [
      fakeQuestion({ id: 10, category: "Cloud", difficulty: "easy" }),
    ];
    const profile: SkillProfile = {
      overallAvg: 9,
      categories: {
        Cloud: { avg: 9, recentAvg: 9, count: 10, trend: "stable" },
      },
      weakestCategory: "Cloud",
      totalAnswers: 10,
    };
    const q = pickAdaptiveQuestion(onlyEasy, profile, "Cloud", 42);
    expect(q.id).toBe(10);
  });

  it("uses weakest category when no target is given", () => {
    const profile: SkillProfile = {
      overallAvg: 6,
      categories: {
        DSA: { avg: 8, recentAvg: 8, count: 5, trend: "improving" },
        OS: { avg: 4, recentAvg: 4, count: 5, trend: "declining" },
      },
      weakestCategory: "OS",
      totalAnswers: 10,
    };
    const q = pickAdaptiveQuestion(DSAPool, profile, undefined, 42);
    expect(q.category).toBe("OS");
  });
});
