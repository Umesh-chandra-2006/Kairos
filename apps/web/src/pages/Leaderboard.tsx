import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "@kairos/shared";
import { api } from "../api/client";

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .leaderboard()
      .then(({ entries: e }) => setEntries(e))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load leaderboard"));
    api
      .myRank()
      .then(({ rank }) => setMyRank(rank))
      .catch(() => undefined);
  }, []);

  return (
    <div className="stack">
      <div className="card">
        <h2 className="card-title">Weekly leaderboard</h2>
        {myRank !== null && <p className="muted">You're ranked #{myRank} this week.</p>}
        {error && <p className="banner banner-error">{error}</p>}
        {entries.length === 0 && !error && <p className="muted">No completed answers yet this week. Be the first!</p>}
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>User</th>
              <th>Answers</th>
              <th>Avg score</th>
              <th>Streak</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.userId}>
                <td>{e.rank}</td>
                <td>{e.name ?? "Anonymous"}</td>
                <td>{e.answers}</td>
                <td>{e.avgScore === null ? "—" : e.avgScore.toFixed(1)}</td>
                <td>{e.currentStreak}🔥</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
