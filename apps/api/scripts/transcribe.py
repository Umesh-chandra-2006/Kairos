"""faster-whisper bridge for the Kairos LocalWhisperProvider.

Usage: python transcribe.py <audio-path> [--model small] [--language en]

Emits a single JSON object on stdout:
  { "transcript": str, "language": str, "durationMs": int,
    "words": [{word,startMs,endMs,confidence}], "segments": [...] }

Exits non-zero with a message on stderr if faster-whisper is unavailable.
Word-level timestamps are mandatory: deterministic delivery metrics are
computed from them downstream.
"""
import argparse
import json
import sys


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("audio_path")
    parser.add_argument("--model", default="small")
    parser.add_argument("--language", default=None)
    args = parser.parse_args()

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("faster-whisper is not installed (pip install faster-whisper)", file=sys.stderr)
        return 2

    # compute_type="int8" keeps CPU-only dev machines and small VPS boxes viable.
    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    segments_iter, info = model.transcribe(
        args.audio_path,
        language=args.language,
        word_timestamps=True,
        vad_filter=True,
    )

    words = []
    segments = []
    for seg in segments_iter:
        seg_text_parts = []
        for w in seg.words or []:
            word = w.word.strip()
            if not word:
                continue
            seg_text_parts.append(word)
            words.append(
                {
                    "word": word,
                    "startMs": int(w.start * 1000),
                    "endMs": int(w.end * 1000),
                    # faster-whisper yields -log prob; map to a rough confidence.
                    "confidence": max(0.0, min(1.0, 1.0 + w.probability)),
                }
            )
        text = " ".join(seg_text_parts)
        if text:
            segments.append({"startMs": int(seg.start * 1000), "endMs": int(seg.end * 1000), "text": text})

    duration_ms = int(info.duration * 1000) if words == [] else max(words[-1]["endMs"], int(info.duration * 1000))
    print(
        json.dumps(
            {
                "transcript": " ".join(s["text"] for s in segments),
                "language": info.language or "unknown",
                "durationMs": duration_ms,
                "words": words,
                "segments": segments,
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
