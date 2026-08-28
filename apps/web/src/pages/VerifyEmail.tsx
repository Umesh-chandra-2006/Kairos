import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { AuthShell } from "../components/forms";

export function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("Verifying your email…");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("This verification link is invalid. Please request a new one.");
      return;
    }
    api
      .verifyEmail(token)
      .then(() => {
        setStatus("ok");
        setMessage("Your email is verified. Redirecting to sign in…");
        const t = setTimeout(() => navigate("/login", { replace: true }), 1800);
        return () => clearTimeout(t);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed.");
      });
  }, [token, navigate]);

  return (
    <AuthShell title="Email verification" subtitle={status === "working" ? "Just a moment…" : undefined}>
      <div className="verify-status" aria-live="polite">
        <span
          className={`verify-icon ${status === "ok" ? "verify-icon-ok" : ""} ${status === "error" ? "verify-icon-error" : ""}`}
          aria-hidden="true"
        >
          {status === "ok" ? "✓" : status === "error" ? "!" : "…"}
        </span>
        <p className={`auth-status-${status === "error" ? "error" : "ok"} verify-message`}>{message}</p>
      </div>
      <div className="verify-actions">
        {status === "ok" ? (
          <button className="btn btn-primary" onClick={() => navigate("/login")}>
            Go to sign in
          </button>
        ) : status === "error" ? (
          <Link to="/login" className="btn btn-primary">
            Back to sign in
          </Link>
        ) : (
          <p className="muted" style={{ textAlign: "center", marginTop: 8 }}>
            This usually takes a few seconds…
          </p>
        )}
      </div>
      {status === "error" && (
        <p className="auth-footer" style={{ marginTop: 16, fontSize: 13 }}>
          Didn't get a link?{" "}
          <Link to="/login" style={{ color: "var(--brand-1)", fontWeight: 600 }}>
            Sign in
          </Link>{" "}
          and request it from your dashboard.
        </p>
      )}
    </AuthShell>
  );
}
