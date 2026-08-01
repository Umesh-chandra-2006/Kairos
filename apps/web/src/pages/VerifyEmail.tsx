import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { AuthShell } from "../components/forms";

export function VerifyEmail() {
  const [params] = useSearchParams();
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
      <p className={status === "error" ? "auth-status-error" : "auth-status-ok"}>{message}</p>
      <div className="link-row">
        <Link to="/login">Continue to sign in</Link>
      </div>
    </AuthShell>
  );
}
