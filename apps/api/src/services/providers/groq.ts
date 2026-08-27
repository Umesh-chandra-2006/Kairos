import { getEnv } from "@kairos/config";
import type { ASRResult, ASRProvider, ASRTokensOpts, ASRSegment, ASRWord } from "./types";

interface GroqSegmentJson {
  start?: number; // seconds
  end?: number;
  text?: string;
}
interface GroqWordJson {
  word?: string;
  start?: number;
  end?: number;
}
interface GroqVerboseJson {
  text?: string;
  language?: string;
  duration?: number;
  segments?: GroqSegmentJson[];
  words?: GroqWordJson[];
}

/**
 * Groq Whisper API — the fallback ASR when local whisper is unavailable.
 * Word timestamps are requested explicitly; if the API omits them, words are
 * derived by even distribution inside each segment (documented approximation
 * that keeps deterministic delivery metrics computable).
 */
export class GroqProvider implements ASRProvider {
  readonly name = "groq";

  get modelVersion(): string {
    return getEnv().GROQ_ASR_MODEL;
  }

  async transcribe(audio: Buffer, mimeType: string, opts?: ASRTokensOpts): Promise<ASRResult> {
    const env = getEnv();
    const key = env.GROQ_API_KEY;
    if (!key) throw new Error("Groq ASR is not configured");

    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(audio)], { type: mimeType }), "audio.webm");
    form.append("model", env.GROQ_ASR_MODEL);
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "segment");
    form.append("timestamp_granularities[]", "word");
    if (opts?.languageHint) form.append("language", opts.languageHint);

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Groq ASR failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as GroqVerboseJson;
    return this.toResult(json);
  }

  private toResult(json: GroqVerboseJson): ASRResult {
    const segments: ASRSegment[] = (json.segments ?? []).map((s) => ({
      startMs: Math.round((s.start ?? 0) * 1000),
      endMs: Math.round((s.end ?? 0) * 1000),
      text: s.text?.trim() ?? "",
    }));

    let words: ASRWord[] = (json.words ?? [])
      .filter((w) => (w.word ?? "").trim().length > 0 && w.start !== undefined && w.end !== undefined)
      .map((w) => ({
        word: w.word!.trim(),
        startMs: Math.round(w.start! * 1000),
        endMs: Math.round(w.end! * 1000),
        confidence: 0.9,
      }));

    let hasRealTimestamps = words.length > 0;
    if (words.length === 0 && segments.length > 0) {
      words = deriveWordsFromSegments(segments);
      hasRealTimestamps = false;
    }

    return {
      transcript: json.text?.trim() || segments.map((s) => s.text).join(" "),
      words,
      segments,
      language: json.language ?? "unknown",
      durationMs: Math.round((json.duration ?? lastEnd(segments, words)) * 1000),
      provider: this.name,
      modelVersion: this.modelVersion,
      hasRealTimestamps,
    };
  }
}

function lastEnd(segments: ASRSegment[], words: ASRWord[]): number {
  return Math.max(words.at(-1)?.endMs ?? 0, segments.at(-1)?.endMs ?? 0, 1);
}

/** Even distribution of segment duration across its words (approximation). */
function deriveWordsFromSegments(segments: ASRSegment[]): ASRWord[] {
  const words: ASRWord[] = [];
  for (const seg of segments) {
    const tokens = seg.text.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    const span = Math.max(seg.endMs - seg.startMs, tokens.length * 120);
    const per = Math.floor(span / tokens.length);
    tokens.forEach((token, i) => {
      const startMs = seg.startMs + i * per;
      words.push({ word: token, startMs, endMs: Math.min(startMs + Math.max(per - 20, 80), seg.endMs), confidence: 0.75 });
    });
  }
  return words;
}
