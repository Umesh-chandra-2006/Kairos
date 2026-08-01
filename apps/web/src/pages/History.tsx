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
      <div className="card">
        <h2 className="card-title">Answer history</h2>
        {error && <p className="banner banner-error">{error}</p>}
        {answers.length === 0 && !error && <p className="muted">No answers yet. Answer today's question to get started.</p>}
        <div className="history-list">
          {answers.map((a) => (
            <div key={a.id} className="history-item">
              <div>
                <span className="tag">{a.question.category}</span>
                <span className={`tag tag-${a.question.difficulty}`}>{a.question.difficulty}</span>
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
              {a.status === "completed" && a.feedback && <p className="feedback">{a.feedback}</p>}
            </div>
          ))}
        </div>
        {nextCursor && (
          <button className="btn btn-secondary" onClick={() => void load(nextCursor)} disabled={busy}>
            Load more
          </button>
        )}
      </div>
      <Link className="muted" to="/">
        ← Back to today
      </Link>
    </div>
  );
}
