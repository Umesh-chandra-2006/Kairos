import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ErrorBanner, SuccessBanner } from "../components/forms";

export function VerifyEmailGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user || user.emailVerified) return <>{children}</>;

  async function resend(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResent(false);
    try {
      await api.post("/api/auth/forgot-password", { email: user!.email });
      setResent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="card">
        <h2>Verify your email</h2>
        <p className="muted" style={{ margin: "12px 0" }}>
          We sent a verification link to <strong>{user.email}</strong>. Please verify your email to continue.
        </p>
        <ErrorBanner message={error} />
        <SuccessBanner message={resent ? "Verification email resent. Check your inbox." : null} />
        <form onSubmit={resend} className="form">
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? "Sending…" : "Resend verification email"}
          </button>
        </form>
      </div>
    </div>
  );
}
