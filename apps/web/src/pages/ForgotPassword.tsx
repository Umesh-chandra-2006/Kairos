import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { AuthShell, ErrorBanner, Field, SuccessBanner } from "../components/forms";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.forgotPassword(email);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a reset link (valid for 1 hour).">
      <form onSubmit={onSubmit} className="form">
        <ErrorBanner message={error} />
        <SuccessBanner message={done ? "If that email exists, a reset link is on its way." : null} />
        {!done && (
          <>
            <Field label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </Field>
            <button className="btn btn-primary" disabled={busy} type="submit">
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </>
        )}
      </form>
      <div className="link-row">
        <Link to="/login">Back to sign in</Link>
      </div>
    </AuthShell>
  );
}
