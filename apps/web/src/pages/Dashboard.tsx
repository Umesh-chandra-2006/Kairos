import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { TodayQuestionResponse } from "@kairos/shared";
import { api, connectAnswerStream } from "../api/client";
import { ErrorBanner } from "../components/forms";

type Phase =
  | { name: "loading" }
  | { name: "idle"; data: TodayQuestionResponse }
  | { name: "submitting" }
  | { name: "evaluating" }
  | { name: "done"; score: number; feedback: string; modelAnswer: string; streak: { current: number; longest: number } | null }
  | { name: "failed"; message: string; data?: TodayQuestionResponse };

export function Dashboard() {
  const [phase, setPhase] = useState<Phase>({ name: "loading" });
  const [answerText, setAnswerText] = useState("");
  const [tokens, setTokens] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState<{ current: number; longest: number } | null>(null);
  const closeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .today()
      .then((data) => {
        if (!mounted) return;
        setPhase({ name: "idle", data });
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Could not load today's question");
        setPhase({ name: "failed", message: "Could not load today's question" });
      });
    api
      .streak()
      .then(({ streak: s }) => {
        if (mounted) setStreak({ current: s.current, longest: s.longest });
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
      closeRef.current?.();
    };
  }, []);

  async function submit() {
    if (phase.name !== "idle" || !phase.data.question) return;
    setError(null);
    setPhase({ name: "submitting" });
    try {
      const { answerId } = await api.submitAnswer(phase.data.question.id, answerText);
      setTokens("");
      setPhase({ name: "evaluating" });
      closeRef.current = connectAnswerStream(answerId, {
        onToken: (delta) => setTokens((prev) => prev + delta),
        onDone: (data) => {
          setPhase({
            name: "done",
            score: data.score,
            feedback: data.feedback,
            modelAnswer: data.modelAnswer,
            streak: data.streak,
          });
        },
        onError: (message) => setPhase({ name: "failed", message }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your answer");
      setPhase({ name: "idle", data: (phase as { name: "idle"; data: TodayQuestionResponse }).data });
    }
  }

  if (phase.name === "loading") {
    return <div className="card">Loading today's question…</div>;
  }

  if (phase.name === "failed" && !phase.data) {
    return (
      <div className="card">
        <ErrorBanner message={error} />
      </div>
    );
  }

  const { data } = phase as { data?: TodayQuestionResponse };

  if (data?.alreadyAnswered) {
    return (
      <div className="card card-center">
        <h2 className="card-title">You're done for today</h2>
        <p className="muted">You've already answered today's question. Great job staying consistent.</p>
        {data.answerId && (
          <Link className="btn btn-primary" to={`/history`}>
            View your answers
          </Link>
        )}
        {streak && <p className="muted">Streak: {streak.current} day{streak.current === 1 ? "" : "s"}</p>}
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="streak-banner">
        {streak && (
          <span>
            🔥 {streak.current} day streak <span className="muted">· longest {streak.longest}</span>
          </span>
        )}
      </div>

      {data?.question && (
        <div className="card">
          <div className="question-meta">
            <span className="tag">{data.question.category}</span>
            <span className={`tag tag-${data.question.difficulty}`}>{data.question.difficulty}</span>
          </div>
          <h2 className="card-title">{data.question.text}</h2>
        </div>
      )}

      {phase.name === "idle" && data?.question && (
        <div className="card">
          <textarea
            className="answer-input"
            placeholder="Write your answer as if you were in the interview… (at least 20 characters)"
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            rows={10}
          />
          <div className="row-end">
            <button className="btn btn-primary" onClick={() => void submit()} disabled={answerText.trim().length < 20}>
              Submit answer
            </button>
          </div>
        </div>
      )}

      {(phase.name === "submitting" || phase.name === "evaluating") && (
        <div className="card">
          <div className="eval-header">
            <span className="spinner" />
            <span>AI is evaluating your answer{phase.name === "submitting" ? "…" : ""}</span>
          </div>
          {tokens && <p className="token-stream">{tokens}</p>}
        </div>
      )}

      {phase.name === "done" && (
        <div className="stack">
          <div className="card">
            <div className="score-row">
              <span className="score">{phase.score}/10</span>
              <div className="score-label">
                <strong>{phase.score >= 8 ? "Strong answer" : phase.score >= 5 ? "Solid effort" : "Keep practicing"}</strong>
                {phase.streak && (
                  <span className="muted">
                    🔥 {phase.streak.current} day streak · longest {phase.streak.longest}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="card">
            <h3 className="card-title">Feedback</h3>
            <p className="feedback">{phase.feedback}</p>
          </div>
          <div className="card">
            <h3 className="card-title">Model answer</h3>
            <p className="model-answer">{phase.modelAnswer}</p>
          </div>
        </div>
      )}

      {phase.name === "failed" && (
        <div className="card">
          <ErrorBanner message={phase.message} />
          <p className="muted">
            Your answer was saved. Add an <code>OPENROUTER_API_KEY</code> to enable AI evaluation, then refresh.
          </p>
        </div>
      )}
    </div>
  );
}
