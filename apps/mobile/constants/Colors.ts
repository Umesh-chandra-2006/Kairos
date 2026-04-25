// Design system tokens for Kairos
// Dark mode premium aesthetic: deep space background + electric violet accent

export const Colors = {
  // Backgrounds
  background: "#0A0A0F",
  surface: "#13131A",
  surfaceElevated: "#1C1C26",
  surfaceBorder: "#2A2A3A",

  // Accent
  accent: "#7C3AED",        // Electric violet
  accentLight: "#9F67FF",
  accentDim: "#3D1A7A",

  // Score colors (spec-defined)
  scoreLow: "#EF4444",       // 1-4: red
  scoreMid: "#F59E0B",       // 5-7: amber (also streak gold)
  scoreHigh: "#10B981",      // 8-10: green

  // Streak
  streakGold: "#F59E0B",
  streakFire: "#FF6B35",

  // Text
  textPrimary: "#F1F0FF",
  textSecondary: "#9B99B5",
  textMuted: "#5A5870",
  textOnAccent: "#FFFFFF",

  // Status
  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",

  // Category badge colors
  categoryColors: {
    DSA: "#6366F1",
    OS: "#EC4899",
    DBMS: "#F59E0B",
    Networks: "#06B6D4",
    OOP: "#8B5CF6",
    SystemDesign: "#10B981",
    Behavioral: "#F97316",
  } as Record<string, string>,

  // Difficulty colors
  difficultyColors: {
    easy: "#10B981",
    medium: "#F59E0B",
    hard: "#EF4444",
  } as Record<string, string>,
};

export function getScoreColor(score: number): string {
  if (score <= 4) return Colors.scoreLow;
  if (score <= 7) return Colors.scoreMid;
  return Colors.scoreHigh;
}
