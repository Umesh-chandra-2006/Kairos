import { useEffect, useState } from "react";
import { api } from "../api/client";

export function Streak() {
  const [streak, setStreak] = useState<{ current: number; longest: number; freezesRemaining: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .streak()
      .then(({ streak: s }) => setStreak(s))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load streak"));
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
