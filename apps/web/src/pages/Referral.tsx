import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ErrorBanner } from "../components/forms";

export function Referral() {
  const [data, setData] = useState<{ code: string; totalReferred: number; rewardDays: number; maxUses: number; inviteUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.referralStats()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load referral info"))
      .finally(() => setLoading(false));
  }, []);

  function copyLink() {
    if (!data) return;
    navigator.clipboard.writeText(data.inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) return <div className="card"><span className="spinner" /></div>;
  if (error) return <div className="card"><ErrorBanner message={error} /></div>;
  if (!data) return null;

  return (
    <div className="stack">
      <div className="card card-center">
        <h2 className="card-title">Invite friends</h2>
        <p className="muted" style={{ textAlign: "center", marginBottom: 20 }}>
          Share your referral link. Both of you earn free Pro days.
        </p>

        <div className="referral-rewards">
          <div className="referral-reward">
            <span className="reward-value">7 days</span>
            <span className="reward-label">You earn per invite</span>
          </div>
          <div className="referral-reward">
            <span className="reward-value">3 days</span>
            <span className="reward-label">Friend earns</span>
          </div>
        </div>

        <div className="referral-link-box">
          <code className="referral-link">{data.inviteUrl}</code>
          <button className="btn btn-primary btn-sm" onClick={copyLink}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="referral-stats-row">
          <div className="referral-stat">
            <span className="referral-stat-value">{data.totalReferred}</span>
            <span className="referral-stat-label">Friends invited</span>
          </div>
          <div className="referral-stat">
            <span className="referral-stat-value">{data.maxUses - data.totalReferred}</span>
            <span className="referral-stat-label">Remaining uses</span>
          </div>
        </div>
      </div>
    </div>
  );
}
