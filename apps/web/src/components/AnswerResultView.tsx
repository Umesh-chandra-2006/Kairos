import type { AnswerStatus } from "@kairos/shared";
import { ErrorBanner } from "./forms";

interface QuestionMeta {
  category: string;
  difficulty: string;
  text: string;
}

interface AnswerResultViewProps {
  status: AnswerStatus;
  score?: number | null;
  feedback?: string | null;
  modelAnswer?: string | null;
  errorMessage?: string | null;
  yourAnswer?: string;
  question?: QuestionMeta | null;
  streak?: { current: number; longest: number } | null;
  isPractice?: boolean;
}

export function AnswerResultView({
  status,
  score,
  feedback,
  modelAnswer,
  errorMessage,
  yourAnswer,
  question,
  streak,
  isPractice,
}: AnswerResultViewProps) {
  const scoreBadge =
    score === null || score === undefined
      ? null
      : score >= 8
        ? "ok"
        : score >= 5
          ? "mid"
          : "low";
  const scoreLabel =
    score === null || score === undefined
      ? null
      : score >= 8
        ? "Strong answer"
        : score >= 5
          ? "Solid effort"
          : "Keep practicing";

  return (
    <div className="stack">
      {question && (
        <div className="card">
          <div className="question-meta">
            <span className="tag">{question.category}</span>
            <span className={`tag tag-${question.difficulty}`}>{question.difficulty}</span>
          </div>
          <h2 className="card-title">{question.text}</h2>
        </div>
      )}

      {status === "completed" && score !== null && score !== undefined && (
        <div className="card">
          <div className="score-row">
            <span className={`score-badge score-badge-${scoreBadge}`}>
              {score}
              <span className="score-total">/10</span>
            </span>
            <div className="score-label">
              <strong>{scoreLabel}</strong>
              {isPractice ? (
                <span className="muted">Practice answer — doesn't affect your streak</span>
              ) : streak ? (
                <span className="muted">
                  🔥 {streak.current} day streak · longest {streak.longest}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {status === "completed" && yourAnswer && (
        <div className="card">
          <h3 className="card-title">Your answer</h3>
          <p className="feedback">{yourAnswer}</p>
        </div>
      )}

      {status === "completed" && feedback && (
        <div className="card">
          <h3 className="card-title">Feedback</h3>
          <p className="feedback">{feedback}</p>
        </div>
      )}

      {status === "completed" && modelAnswer && (
        <div className="card">
          <h3 className="card-title">Model answer</h3>
          <p className="model-answer">{modelAnswer}</p>
        </div>
      )}

      {status === "failed" && (
        <div className="card">
          <ErrorBanner message={errorMessage ?? "Evaluation failed"} />
          <p className="muted">Your answer was saved. Evaluation can be retried later.</p>
        </div>
      )}

      {(status === "pending" || status === "evaluating") && (
        <div className="card">
          <div className="eval-header">
            <span className="spinner" />
            <span>AI is evaluating your answer…</span>
          </div>
        </div>
      )}
    </div>
  );
}
