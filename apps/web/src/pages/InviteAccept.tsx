import { useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";

const STORAGE_KEY = "kairos_referral_code";

export function InviteAccept() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      localStorage.setItem(STORAGE_KEY, code);
      navigate("/register", { replace: true });
    }
  }, [code, navigate]);

  return (
    <div className="center-screen">
      <div className="card">
        <h2>Redirecting…</h2>
        <p className="muted">Setting up your referral code.</p>
      </div>
    </div>
  );
}
