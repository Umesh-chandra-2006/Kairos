import type { LanguageCheck } from "@kairos/shared";

/**
 * Conservative language gate (build-plan §Wave1): flag, don't punish.
 * A submission is marked unsuitable only on clear evidence the transcript is
 * not English — non-Latin scripts or an overwhelming share of common Hinglish
 * function words. Unsuitable submissions are still evaluated; the flag travels
 * with the result so friction can be measured instead of guessed.
 */

const DEVANAGARI = /[\u0900-\u097F]/;
const OTHER_NON_LATIN = /[\u0600-\u06FF\u0B80-\u0BFF\u0C00-\u0C7F\u0980-\u09FF]/;

// High-frequency Hindi-in-Latin-script tokens that survive code-switching.
const HINGISH_TOKENS = new Set([
  "hai", "hain", "nahi", "nahin", "kya", "kyun", "kyu", "aur", "matlab", "bhi",
  "toh", "ka", "ki", "ke", "ko", "se", "mein", "yeh", "woh",
  "karo", "karna", "karke", "liye", "wala", "wali", "tha", "thi", "hum",
]);

export function checkLanguage(transcript: string): LanguageCheck {
  const tokens = transcript.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);

  // 1. Script check: non-Latin script flags immediately.
  if (DEVANAGARI.test(transcript)) {
    return { detectedLanguage: "hi", codeSwitchProbability: 1, suitable: false, rejectionReason: "non-latin script (Devanagari) detected" };
  }
  if (OTHER_NON_LATIN.test(transcript)) {
    return { detectedLanguage: "non-en", codeSwitchProbability: 1, suitable: false, rejectionReason: "non-latin script detected" };
  }

  // 2. Ratio check: a handful of Hinglish words is normal Indian-English
  // speech and must NOT flag. Require both a minimum sample size AND >35%
  // Hinglish function words before marking unsuitable.
  const hingish = tokens.filter((t) => HINGISH_TOKENS.has(t)).length;
  const ratio = tokens.length > 0 ? hingish / tokens.length : 0;

  if (tokens.length >= 20 && ratio > 0.35) {
    return { detectedLanguage: "hi-latn", codeSwitchProbability: round(ratio), suitable: false, rejectionReason: "predominantly Hinglish transcript" };
  }

  return { detectedLanguage: "en", codeSwitchProbability: round(ratio), suitable: true, rejectionReason: null };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
