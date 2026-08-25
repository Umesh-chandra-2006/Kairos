import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getEnv } from "@kairos/config";
import { logger } from "../../lib/logger";
import type { ASRResult, ASRProvider, ASRTokensOpts } from "./types";

interface WhisperWordJson {
  word: string;
  startMs: number;
  endMs: number;
  confidence: number;
}
interface WhisperSegmentJson {
  startMs: number;
  endMs: number;
  text: string;
}
interface WhisperOutputJson {
  transcript: string;
  language: string;
  durationMs: number;
  words: WhisperWordJson[];
  segments: WhisperSegmentJson[];
}

const PYTHON_CANDIDATES = ["python", "python3", "py"];

function runOnce(cmd: string, args: string[], timeoutMs: number): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", () => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}

/**
 * Local speech-to-text via faster-whisper through a Python subprocess.
 * Primary ASR in the auto chain — zero marginal cost, no audio leaving the box.
 */
export class LocalWhisperProvider implements ASRProvider {
  readonly name = "localwhisper";

  private probePromise: Promise<boolean> | null = null;

  get modelVersion(): string {
    return `faster-whisper:${getEnv().WHISPER_MODEL}`;
  }

  /** Cheap availability probe (cached): a python that can import faster_whisper. */
  async available(): Promise<boolean> {
    if (!this.probePromise) {
      this.probePromise = (async () => {
        for (const py of PYTHON_CANDIDATES) {
          const res = await runOnce(py, ["-c", "import faster_whisper"], 10_000);
          if (res.code === 0) return true;
        }
        return false;
      })();
    }
    return this.probePromise;
  }

  async transcribe(audio: Buffer, _mimeType: string, opts?: ASRTokensOpts): Promise<ASRResult> {
    const env = getEnv();
    const tmp = path.join(os.tmpdir(), `kairos-${Date.now()}-${Math.random().toString(36).slice(2)}.webm`);
    await fs.writeFile(tmp, audio);
    try {
      for (const py of PYTHON_CANDIDATES) {
        const res = await runOnce(
          py,
          [path.join(process.cwd(), "scripts", "transcribe.py"), tmp, "--model", env.WHISPER_MODEL],
          120_000,
        );
        if (res.code === 2) break; // module missing on this python; try next candidate only for spawn errors
        if (res.code !== 0) {
          logger.warn({ stderr: res.stderr.slice(0, 500) }, "faster-whisper transcribe failed");
          continue;
        }
        const parsed = JSON.parse(res.stdout.trim()) as WhisperOutputJson;
        return this.toResult(parsed, opts?.languageHint);
      }
      throw new Error("Local whisper unavailable");
    } finally {
      await fs.rm(tmp, { force: true });
    }
  }

  private toResult(parsed: WhisperOutputJson, _languageHint?: string): ASRResult {
    return {
      transcript: parsed.transcript,
      words: parsed.words,
      segments: parsed.segments,
      language: parsed.language,
      durationMs: parsed.durationMs,
      provider: this.name,
      modelVersion: this.modelVersion,
    };
  }
}
