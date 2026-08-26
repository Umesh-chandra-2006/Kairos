import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ErrorBanner, SuccessBanner } from "../components/forms";

interface Plan {
  id: string;
  name: string;
  price: number;
  evalsPerDay: number;
  voiceMinutesPerDay: number;
  features: string[];
}

interface Usage {
  evaluationsUsed: number;
  evaluationsLimit: number;
  voiceMinutesUsed: number;
  voiceMinutesLimit: number;
}

interface BillingState {
  plans: Plan[];
  current: { plan: string; status: string };
}

export function Billing() {
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("billing") === "success") {
      setSuccess("Your subscription is now active! Enjoy unlimited practice.");
      window.history.replaceState({}, "", "/settings");
    }
    Promise.all([
      api.get<BillingState>("/api/billing/plans"),
      api.get<{ usage: Usage }>("/api/account/stats"),
    ])
      .then(([b, u]) => {
        setBilling(b);
        setUsage(u as unknown as Usage);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load billing info"))
      .finally(() => setLoading(false));
  }, []);

  async function handleUpgrade() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await api.post<{ url: string }>("/api/billing/checkout");
      if (url) window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout");
    } finally {
      setBusy(false);
    }
  }

  async function handleManage() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await api.post<{ url: string }>("/api/billing/portal");
      if (url) window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open billing portal");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="card"><span className="spinner" /> Loading billing…</div>;

  const currentPlan = billing?.current?.plan ?? "free";

  return (
    <div className="stack">
      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      <div className="card">
        <h2 className="card-title">Your Plan</h2>
        <div className="plan-current">
          <span className="plan-badge">{currentPlan === "pro" ? "Pro" : "Free"}</span>
          {currentPlan === "pro" ? (
            <button className="btn btn-ghost" onClick={() => void handleManage()} disabled={busy}>
              Manage subscription
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => void handleUpgrade()} disabled={busy}>
              {busy ? "Redirecting…" : "Upgrade to Pro — ₹9.99/month"}
            </button>
          )}
        </div>
      </div>

      {billing?.plans && (
        <div className="plans-grid">
          {billing.plans.map((plan) => (
            <div key={plan.id} className={`card plan-card ${currentPlan === plan.id ? "plan-active" : ""}`}>
              <h3 className="plan-name">{plan.name}</h3>
              <p className="plan-price">{plan.price === 0 ? "Free" : `₹${(plan.price / 100).toFixed(0)}/mo`}</p>
              <ul className="plan-features">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {currentPlan !== plan.id && plan.id === "pro" && (
                <button className="btn btn-primary" onClick={() => void handleUpgrade()} disabled={busy}>
                  Upgrade
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
