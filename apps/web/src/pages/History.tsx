import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AnswerWithQuestion } from "@kairos/shared";
import { api } from "../api/client";

export function History() {
  const [answers, setAnswers] = useState<AnswerWithQuestion[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (cursor?: number) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.history(cursor);
      setAnswers((prev) => (cursor ? [...prev, ...res.answers] : res.answers));
      setNextCursor(res.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load history");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="stack">
      <div>
        <h1 className="card-title">Answer history</h1>
        <p className="muted">Tap an answer to see your score, feedback, and the model answer.</p>
      </div>
      {error && <p className="banner banner-error">{error}</p>}
      {answers.length === 0 && !error && (
        <div className="card empty-state">
          <span className="empty-icon">✍️</span>
          <p className="empty-title">No answers yet</p>
          <p className="muted">Answer today's question to start building your track record.</p>
          <Link className="btn btn-primary" to="/">
            Answer today's question
          </Link>
        </div>
      )}
      <div className="history-list">
        {answers.map((a) => (
          <Link key={a.id} to={`/history/${a.id}`} className="history-item history-link">
            <div className="row-between">
              <div className="question-meta" style={{ marginBottom: 0 }}>
                <span className="tag">{a.question.category}</span>
                <span className={`tag tag-${a.question.difficulty}`}>{a.question.difficulty}</span>
              </div>
              <span className="history-chevron">›</span>
            </div>
            <p className="history-question">{a.question.text}</p>
            <div className="row-between">
              <span className="muted">{a.date}</span>
              <span>
                {a.status === "completed" ? (
                  <strong className={a.score! >= 7 ? "score-ok" : a.score! >= 5 ? "score-mid" : "score-low"}>{a.score}/10</strong>
                ) : (
                  <span className="muted">{a.status}</span>
                )}
              </span>
            </div>
          </Link>
        ))}
      </div>
      {nextCursor && (
        <button className="btn btn-secondary" onClick={() => void load(nextCursor)} disabled={busy}>
          Load more
        </button>
      )}
      <Link className="muted" to="/">
        ← Back to today
      </Link>
    </div>
  );
}
