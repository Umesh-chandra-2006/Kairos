import { useEffect, useRef, useState } from "react";
import { CATEGORIES, type Question } from "@kairos/shared";
import { api, watchAnswerResult } from "../api/client";
import { ErrorBanner } from "../components/forms";
import { AnswerResultView } from "../components/AnswerResultView";

type Phase =
  | { name: "pick" }
  | { name: "loading" }
  | { name: "idle"; question: Question }
  | { name: "submitting" }
  | { name: "evaluating" }
  | { name: "done"; score: number; feedback: string; modelAnswer: string; question: Question }
  | { name: "failed"; message: string };

export function Practice() {
  const [phase, setPhase] = useState<Phase>({ name: "pick" });
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [answerText, setAnswerText] = useState("");
  const [tokens, setTokens] = useState("");
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<(() => void) | null>(null);

  useEffect(() => () => closeRef.current?.(), []);

  function loadQuestion(cat?: string) {
    setCategory(cat);
    setError(null);
    setTokens("");
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
    setPhase({ name: "submitting" });
    try {
      const { answerId } = await api.submitPractice(question.id, answerText);
      setPhase({ name: "evaluating" });
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

  if (phase.name === "idle" || phase.name === "submitting" || phase.name === "evaluating") {
    const { question } = phase as { question?: Question };
    return (
      <div className="stack">
        <div className="row-between">
          <span className="tag">{category ?? "All topics"}</span>
          <button
            className="btn btn-ghost"
            onClick={() => setPhase({ name: "pick" })}
            disabled={phase.name !== "idle"}
          >
            Change topic
          </button>
        </div>

        {question && (
          <div className="card">
            <div className="question-meta">
              <span className="tag">{question.category}</span>
              <span className={`tag tag-${question.difficulty}`}>{question.difficulty}</span>
            </div>
            <h2 className="card-title">{question.text}</h2>
          </div>
        )}

        {phase.name === "idle" && (
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

        {(phase.name === "submitting" || phase.name === "evaluating") && (
          <div className="card">
            <div className="eval-header">
              <span className="spinner" />
              <span>AI is evaluating your answer…</span>
            </div>
            {tokens && <p className="token-stream">{tokens}</p>}
          </div>
        )}
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
