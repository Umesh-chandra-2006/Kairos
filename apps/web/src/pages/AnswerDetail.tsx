import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { AnswerWithQuestion } from "@kairos/shared";
import { api } from "../api/client";
import { AnswerResultView } from "../components/AnswerResultView";

export function AnswerDetail() {
  const { id } = useParams();
  const answerId = Number(id);
  const [answer, setAnswer] = useState<AnswerWithQuestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setAnswer(null);
    setError(null);
    api
      .answer(answerId)
      .then(({ answer: a }) => {
        if (mounted) setAnswer(a);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : "Could not load this answer");
      });
    return () => {
      mounted = false;
    };
  }, [answerId]);

  if (error) {
    return (
      <div className="stack">
        <Link className="muted" to="/history">
          ← Back to history
        </Link>
        <div className="card">
          <h2 className="card-title">Result unavailable</h2>
          <p className="muted">{error}</p>
        </div>
      </div>
    );
  }

  if (!answer) {
    return (
      <div className="card">
        <div className="eval-header">
          <span className="spinner" />
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <Link className="muted" to="/history">
        ← Back to history
      </Link>
      <AnswerResultView
        status={answer.status}
        score={answer.score}
        feedback={answer.feedback}
        modelAnswer={answer.modelAnswer}
        errorMessage={answer.errorMessage}
        yourAnswer={answer.answerText}
        question={answer.question}
        isPractice={answer.isPractice}
      />
    </div>
  );
}
