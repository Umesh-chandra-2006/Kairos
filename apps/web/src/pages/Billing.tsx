import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

interface Plan {
  id: string;
  name: string;
  price: number;
  currency?: string;
  interval: string;
  features: string[];
}

interface PlansResponse {
  plans: Plan[];
  currentPlan: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export default function Billing() {
  const navigate = useNavigate();
  const [data, setData] = useState<PlansResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    api.getPlans()
      .then(setData)
      .catch(() => setError("Failed to load plans"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("billing") === "success") {
      api.getPlans().then(setData);
    }
  }, []);

  const handleCheckout = async (planId: string) => {
    if (planId === "free") return;
    setCheckoutLoading(true);
    try {
      const result = await api.createCheckout();
      if (result.shortUrl) {
        window.location.href = result.shortUrl;
      } else {
        setError("Razorpay checkout not available. Please configure RAZORPAY_PLAN_ID.");
      }
    } catch {
      setError("Failed to start checkout. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel your Pro subscription? You'll keep access until the end of your billing period.")) return;
    setCancelLoading(true);
    try {
      await api.cancelPlan();
      const updated = await api.getPlans();
      setData(updated);
    } catch {
      setError("Failed to cancel. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) return <div className="page-center"><div className="spinner" /></div>;

  return (
    <div className="page-container">
      <h1 className="section-title">Subscription</h1>
      <p className="section-desc">Choose the plan that works for you.</p>

      {error && <div className="alert alert-error" onClick={() => setError("")}>{error}</div>}

      {data?.currentPlan === "pro" && (
        <div className="billing-current">
          <div className="billing-current-header">
            <h3>Current plan: Pro</h3>
            {data.currentPeriodEnd && (
              <span>Renews {new Date(data.currentPeriodEnd).toLocaleDateString()}</span>
            )}
          </div>
          <button
            className="btn btn-danger btn-sm"
            onClick={handleCancel}
            disabled={cancelLoading}
          >
            {cancelLoading ? "Cancelling..." : "Cancel subscription"}
          </button>
        </div>
      )}

      <div className="billing-grid">
        {data?.plans.map((plan) => (
          <div
            key={plan.id}
            className={`billing-card ${plan.id === data.currentPlan ? "billing-card-active" : ""}`}
          >
            <h3>{plan.name}</h3>
            <div className="billing-price">
              {plan.price === 0 ? (
                <span>Free</span>
              ) : (
                <span>₹{(plan.price / 100).toLocaleString()}/{plan.interval}</span>
              )}
            </div>
            <ul className="billing-features">
              {plan.features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
            {plan.id === data?.currentPlan ? (
              <button className="btn btn-secondary" disabled>Current plan</button>
            ) : plan.id === "pro" ? (
              <button
                className="btn btn-primary"
                onClick={() => handleCheckout(plan.id)}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? "Loading..." : "Upgrade to Pro"}
              </button>
            ) : (
              <button className="btn btn-secondary" disabled>Downgrade</button>
            )}
          </div>
        ))}
      </div>

      <div className="billing-note">
        <p>Payments are processed securely via Razorpay. Cancel anytime.</p>
      </div>
    </div>
  );
}
