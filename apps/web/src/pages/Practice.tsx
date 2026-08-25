import { useEffect, useRef, useState } from "react";
import { CATEGORIES, type EvaluationResult, type Question } from "@kairos/shared";
import { api, watchAnswerResult, watchVoiceEvaluation, type VoiceStage } from "../api/client";
import { ErrorBanner } from "../components/forms";
import { AnswerResultView } from "../components/AnswerResultView";
import { VoiceResultView } from "../components/VoiceResultView";

type Mode = "text" | "voice";

type Phase =
  | { name: "pick" }
  | { name: "loading" }
  | { name: "idle"; question: Question }
  | { name: "recording"; question: Question }
  | { name: "submitting"; question: Question; voice: boolean }
  | { name: "evaluating"; question: Question; voice: boolean }
  | { name: "done"; score: number; feedback: string; modelAnswer: string; question: Question }
  | {
      name: "voiceDone";
      result: EvaluationResult;
      transcript: string | null;
      question: Question;
    }
  | { name: "failed"; message: string };

const MAX_RECORDING_MS = 120_000;

const STAGE_LABEL: Record<VoiceStage, string> = {
  queued: "Waiting for an evaluator…",
  transcribing: "Transcribing your answer…",
  evaluating: "AI is evaluating your answer…",
};

export function Practice() {
  const [phase, setPhase] = useState<Phase>({ name: "pick" });
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [answerText, setAnswerText] = useState("");
  const [tokens, setTokens] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [mode, setMode] = useState<Mode>("text");
  const [stage, setStage] = useState<VoiceStage | null>(null);
  const [recSeconds, setRecSeconds] = useState(0);
  const closeRef = useRef<(() => void) | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    closeRef.current?.();
    stopTimers();
    mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => {
    let alive = true;
    api
      .flags()
      .then(({ flags }) => {
        if (alive) setVoiceEnabled(!!flags.voice_v2);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  function stopTimers() {
    if (tickRef.current) clearInterval(tickRef.current);
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    tickRef.current = null;
    maxTimerRef.current = null;
  }

  function loadQuestion(cat?: string) {
    setCategory(cat);
    setError(null);
    setTokens("");
    setStage(null);
    setAnswerText("");
    setPhase({ name: "loading" });
    api
      .practice(cat)
      .then(({ question }) => setPhase({ name: "idle", question }))
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Could not load a practice question";
        setError(message);
        setPhase({ name: "failed", message });
      });
  }

  async function submit() {
    if (phase.name !== "idle") return;
    const question = phase.question;
    setError(null);
    setTokens("");
    setPhase({ name: "submitting", question, voice: false });
    try {
      const { answerId } = await api.submitPractice(question.id, answerText);
      setPhase({ name: "evaluating", question, voice: false });
      closeRef.current = watchAnswerResult(answerId, {
        onToken: (delta) => setTokens((prev) => prev + delta),
        onDone: (data) =>
          setPhase({
            name: "done",
            score: data.score,
            feedback: data.feedback,
            modelAnswer: data.modelAnswer,
            question,
          }),
        onError: (message) => setPhase({ name: "failed", message }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your answer");
      setPhase({ name: "idle", question });
    }
  }

  async function startRecording(question: Question) {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const elapsedMs = Date.now() - startedAtRef.current;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        void uploadAndEvaluate(blob, elapsedMs, question);
      };
      startedAtRef.current = Date.now();
      mediaRef.current = recorder;
      recTimerStart(question);
      recorder.start();
      setPhase({ name: "recording", question });
    } catch {
      setError("Microphone access was denied. Allow mic permission or switch to typing.");
      return;
    }
  }

  function recTimerStart(question: Question) {
    setRecSeconds(0);
    tickRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    maxTimerRef.current = setTimeout(() => stopRecording(question), MAX_RECORDING_MS);
  }

  function stopRecording(question?: Question) {
    stopTimers();
    const q = question ?? (phase.name === "recording" ? phase.question : undefined);
    mediaRef.current?.stop();
    mediaRef.current = null;
    if (!q) setPhase({ name: "failed", message: "Recording lost — please try again." });
  }

  async function uploadAndEvaluate(blob: Blob, elapsedMs: number, question: Question) {
    setError(null);
    setStage(null);
    setPhase({ name: "submitting", question, voice: true });
    try {
      const key = crypto.randomUUID().replace(/-/g, "");
      const { submissionId } = await api.submitVoice(question.id, key, blob, elapsedMs);
      setPhase({ name: "evaluating", question, voice: true });
      closeRef.current = watchVoiceEvaluation(submissionId, {
        onStage: (s) => setStage(s),
        onDone: (data) => {
          if (data.evaluation) {
            setPhase({ name: "voiceDone", result: data.evaluation, transcript: data.transcript, question });
          } else {
            setPhase({
              name: "failed",
              message: data.languageBlocked
                ? "Please answer in English — the evaluator only supports English right now."
                : (data.errorMessage ?? "Evaluation failed"),
            });
          }
        },
        onError: (message) => setPhase({ name: "failed", message }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload your recording");
      setPhase({ name: "idle", question });
    }
  }

  if (phase.name === "pick") {
    return (
      <div className="stack">
        <div>
          <h1 className="card-title">Practice mode</h1>
          <p className="muted">
            Sharpen your skills beyond the daily challenge. Pick a topic and answer a random question.
          </p>
        </div>
        <div className="card">
          <div className="chip-grid">
            <button className="chip" onClick={() => loadQuestion(undefined)}>
              🎲 Surprise me
            </button>
            {CATEGORIES.map((c) => (
              <button key={c} className="chip" onClick={() => loadQuestion(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase.name === "loading") {
    return (
      <div className="card">
        <div className="eval-header">
          <span className="spinner" />
          <span>Picking a practice question…</span>
        </div>
      </div>
    );
  }

  if (phase.name === "failed") {
    return (
      <div className="stack">
        <div className="row-between">
          <span className="tag">{category ?? "All topics"}</span>
          <button className="btn btn-secondary" onClick={() => setPhase({ name: "pick" })}>
            Change topic
          </button>
        </div>
        <div className="card">
          <ErrorBanner message={error ?? phase.message} />
          <div className="row-end">
            <button className="btn btn-primary" onClick={() => loadQuestion(category)}>
              Try another question
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (
    phase.name === "idle" ||
    phase.name === "recording" ||
    phase.name === "submitting" ||
    phase.name === "evaluating"
  ) {
    const { question } = phase;
    const busy = phase.name === "submitting" || phase.name === "evaluating";
    return (
      <div className="stack">
        <div className="row-between">
          <span className="tag">{category ?? "All topics"}</span>
          <button className="btn btn-ghost" onClick={() => setPhase({ name: "pick" })} disabled={busy || phase.name === "recording"}>
            Change topic
          </button>
        </div>

        <div className="card">
          <div className="question-meta">
            <span className="tag">{question.category}</span>
            <span className={`tag tag-${question.difficulty}`}>{question.difficulty}</span>
          </div>
          <h2 className="card-title">{question.text}</h2>
        </div>

        {voiceEnabled && phase.name === "idle" && (
          <div className="seg" role="tablist" aria-label="Answer mode">
            <button
              role="tab"
              aria-selected={mode === "text"}
              className={`seg-btn ${mode === "text" ? "active" : ""}`}
              onClick={() => setMode("text")}
            >
              ⌨ Type
            </button>
            <button
              role="tab"
              aria-selected={mode === "voice"}
              className={`seg-btn ${mode === "voice" ? "active" : ""}`}
              onClick={() => setMode("voice")}
            >
              🎙 Speak
            </button>
          </div>
        )}

        {phase.name === "idle" && mode === "text" && (
          <div className="card">
            <textarea
              className="answer-input"
              placeholder="Write your answer as if you were in the interview… (at least 20 characters)"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              rows={10}
            />
            <div className="row-between">
              <button className="btn btn-secondary" onClick={() => loadQuestion(category)}>
                Skip question
              </button>
              <button
                className="btn btn-primary"
                onClick={() => void submit()}
                disabled={answerText.trim().length < 20}
              >
                Submit answer
              </button>
            </div>
          </div>
        )}

        {phase.name === "idle" && mode === "voice" && (
          <div className="card voice-card">
            <p className="muted">
              Answer out loud, as you would in the interview. Speak for up to two minutes, then stop to get
              evaluated on content, structure and delivery.
            </p>
            <div className="row-end">
              <button className="btn btn-secondary" onClick={() => loadQuestion(category)}>
                Skip question
              </button>
              <button className="btn btn-primary" onClick={() => void startRecording(question)}>
                🎙 Start recording
              </button>
            </div>
          </div>
        )}

        {phase.name === "recording" && (
          <div className="card voice-card recording">
            <div className="rec-row">
              <span className="rec-dot" />
              <span className="rec-timer">REC {Math.floor(recSeconds / 60)}:{String(recSeconds % 60).padStart(2, "0")}</span>
            </div>
            <p className="muted">Make your point, back it up, wrap up clearly.</p>
            <div className="row-end">
              <button className="btn btn-primary" onClick={() => stopRecording()}>
                ■ Stop &amp; evaluate
              </button>
            </div>
          </div>
        )}

        {busy && (
          <div className="card">
            <div className="eval-header">
              <span className="spinner" />
              <span>
                {phase.name === "submitting"
                  ? mode === "voice"
                    ? "Uploading your recording…"
                    : "Submitting your answer…"
                  : phase.voice
                    ? STAGE_LABEL[stage ?? "queued"]
                    : "AI is evaluating your answer…"}
              </span>
            </div>
            {!phase.voice && tokens && <p className="token-stream">{tokens}</p>}
          </div>
        )}
      </div>
    );
  }

  if (phase.name === "voiceDone") {
    return (
      <div className="stack">
        <div className="row-between">
          <span className="tag">{category ?? "All topics"}</span>
          <button className="btn btn-secondary" onClick={() => loadQuestion(category)}>
            Practice another
          </button>
        </div>
        <VoiceResultView result={phase.result} transcript={phase.transcript} />
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row-between">
        <span className="tag">{category ?? "All topics"}</span>
        <button className="btn btn-secondary" onClick={() => loadQuestion(category)}>
          Practice another
        </button>
      </div>
      <AnswerResultView
        status="completed"
        score={phase.score}
        feedback={phase.feedback}
        modelAnswer={phase.modelAnswer}
        yourAnswer={answerText}
        question={phase.question}
        isPractice
      />
    </div>
  );
}
