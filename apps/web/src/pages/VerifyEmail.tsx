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
      setMessage("Missing verification token.");
      return;
    }
    api
      .verifyEmail(token)
      .then(() => {
        setStatus("ok");
        setMessage("Email verified! You're all set.");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed.");
      });
  }, [token]);

  return (
    <AuthShell title="Email verification">
      <p className={status === "error" ? "auth-status-error" : "auth-status-ok"} style={{ textAlign: "center" }}>
        {message}
      </p>
      <div className="verify-actions">
        {status === "ok" ? (
          <button className="btn btn-primary" onClick={() => navigate("/")}>
            Continue to Kairos
          </button>
        ) : status === "error" ? (
          <Link to="/login" className="btn btn-primary">
            Go to sign in
          </Link>
        ) : (
          <p className="muted" style={{ textAlign: "center", marginTop: 8 }}>
            This usually takes a few seconds…
          </p>
        )}
      </div>
    </AuthShell>
  );
}
