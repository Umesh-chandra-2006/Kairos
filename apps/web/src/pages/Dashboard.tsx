import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { TodayQuestionResponse } from "@kairos/shared";
import { api, watchAnswerResult } from "../api/client";
import { ErrorBanner } from "../components/forms";
import { AnswerResultView } from "../components/AnswerResultView";

type Phase =
  | { name: "loading" }
  | { name: "idle"; data: TodayQuestionResponse }
  | { name: "submitting" }
  | { name: "evaluating" }
  | { name: "done"; score: number; feedback: string; modelAnswer: string; streak: { current: number; longest: number } | null }
  | { name: "failed"; message: string; data?: TodayQuestionResponse };

export function Dashboard() {
  const [phase, setPhase] = useState<Phase>({ name: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [answerText, setAnswerText] = useState("");
  const [tokens, setTokens] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState<{ current: number; longest: number } | null>(null);
  const closeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let mounted = true;
    setPhase({ name: "loading" });
    setError(null);
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
  }, [reloadKey]);

  async function submit() {
    if (phase.name !== "idle" || !phase.data.question) return;
    const todayData = phase.data;
    const question = todayData.question;
    if (!question) return;
    setError(null);
    setPhase({ name: "submitting" });
    try {
      const { answerId } = await api.submitAnswer(question.id, answerText);
      setTokens("");
      setPhase({ name: "evaluating" });
      closeRef.current = watchAnswerResult(answerId, {
        onToken: (delta) => setTokens((prev) => prev + delta),
        onDone: (data) => {
          setPhase({
            name: "done",
            score: data.score,
            feedback: data.feedback,
            modelAnswer: data.modelAnswer,
            streak: data.streak,
          });
          api
            .streak()
            .then(({ streak: s }) => setStreak({ current: s.current, longest: s.longest }))
            .catch(() => undefined);
        },
        onError: (message) => setPhase({ name: "failed", message, data: todayData }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your answer");
      setPhase({ name: "idle", data: todayData });
    }
  }

  if (phase.name === "loading") {
    return (
      <div className="card">
        <div className="eval-header">
          <span className="spinner" />
          <span>Loading today's question…</span>
        </div>
      </div>
    );
  }

  if (phase.name === "failed" && !phase.data) {
    return (
      <div className="card">
        <ErrorBanner message={phase.message ?? error} />
        <div className="row-end">
          <button className="btn btn-primary" onClick={() => setReloadKey((k) => k + 1)}>
            Try again
          </button>
        </div>
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
          <Link className="btn btn-primary" to={`/history/${data.answerId}`}>
            View your result
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

      {phase.name === "idle" && data?.question && (
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
            <span>AI is evaluating your answer…</span>
          </div>
          {tokens && <p className="token-stream">{tokens}</p>}
        </div>
      )}

      {phase.name === "done" && (
        <AnswerResultView
          status="completed"
          score={phase.score}
          feedback={phase.feedback}
          modelAnswer={phase.modelAnswer}
          yourAnswer={answerText}
          question={data?.question}
          streak={phase.streak ?? streak}
        />
      )}

      {phase.name === "failed" && (
        <AnswerResultView status="failed" errorMessage={phase.message} question={data?.question} />
      )}
    </div>
  );
}
