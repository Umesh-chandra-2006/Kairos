import { useEffect, useState } from "react";
import { api } from "../api/client";

interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  answered: number;
  avgScore: number | null;
  weakestCategory: string | null;
}

export function Streak() {
  const [streak, setStreak] = useState<{ current: number; longest: number; freezesRemaining: number } | null>(null);
  const [weekly, setWeekly] = useState<WeeklySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .streak()
      .then(({ streak: s }) => setStreak(s))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load streak"));
    api
      .weeklySummary()
      .then(({ summary }) => setWeekly(summary))
      .catch(() => {
        /* non-critical */
      });
  }, []);

  async function refill() {
    setBusy(true);
    setError(null);
    try {
      const { streak: s } = await api.refillFreezes();
      setStreak(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refill freeze");
    } finally {
      setBusy(false);
    }
  }

  if (!streak) {
    return <div className="card">{error ?? "Loading…"}</div>;
  }

  return (
    <div className="stack">
      <div className="card">
        <h2 className="card-title">Your streak</h2>
        <div className="stats-row">
          <div className="stat">
            <span className="stat-value">{streak.current}</span>
            <span className="stat-label">Current streak (days)</span>
          </div>
          <div className="stat">
            <span className="stat-value">{streak.longest}</span>
            <span className="stat-label">Longest streak</span>
          </div>
          <div className="stat">
            <span className="stat-value">{streak.freezesRemaining}</span>
            <span className="stat-label">Freezes available</span>
          </div>
        </div>
        <p className="muted">
          A freeze keeps your streak alive when you miss a day. You get one freeze per week.
        </p>
        <button className="btn btn-secondary" onClick={() => void refill()} disabled={busy || streak.freezesRemaining >= 1}>
          {busy ? "Refilling…" : "Refill weekly freeze"}
        </button>
        {error && <p className="banner banner-error">{error}</p>}
      </div>
      {weekly ? (
        <div className="card">
          <h3 className="card-title">Last week</h3>
          {weekly.answered > 0 ? (
            <>
              <div className="stats-row">
                <div className="stat">
                  <span className="stat-value">{weekly.answered}</span>
                  <span className="stat-label">Questions answered</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{weekly.avgScore ?? "–"}</span>
                  <span className="stat-label">Average score /10</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{weekly.weakestCategory ?? "–"}</span>
                  <span className="stat-label">Focus area</span>
                </div>
              </div>
              <p className="muted">
                {weekly.weakestCategory
                  ? `Your weakest area was ${weekly.weakestCategory} — try a practice round there.`
                  : "No scored answers yet — the evaluation AI needs a key to score."}
              </p>
            </>
          ) : (
            <p className="muted">You didn't answer any daily questions last week. A fresh week starts today.</p>
          )}
        </div>
      ) : null}
      <div className="card">
        <h3 className="card-title">How it works</h3>
        <ul className="how-list">
          <li>Answer today's question to advance your streak by 1.</li>
          <li>Miss a day? A freeze keeps it alive — one per week.</li>
          <li>Longest streak counts your personal record.</li>
        </ul>
      </div>
    </div>
  );
}
