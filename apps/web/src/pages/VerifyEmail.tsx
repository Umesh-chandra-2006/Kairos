import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { AuthShell } from "../components/forms";

export function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("Verifying your email…");
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (!token) {
      setStatus("error");
      setMessage("This verification link is invalid. Please request a new one.");
      return;
    }
    firedRef.current = true;
    api
      .verifyEmail(token)
      .then(async () => {
        setStatus("ok");
        setMessage("Your email is verified. Taking you to sign in…");
        // Best-effort: clear the register-time session so the login form shows.
        try {
          await logout();
        } catch {
          /* session may already be gone */
        }
        setTimeout(() => navigate("/login", { replace: true }), 1600);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed.");
      });
  }, [token, navigate, logout]);

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
