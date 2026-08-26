import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerPasswordHint, validateRegisterForm, type RegisterFormErrors } from "@kairos/shared";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { AuthShell, ErrorBanner, Field } from "../components/forms";

const REFERRAL_STORAGE_KEY = "kairos_referral_code";

function errorsFromApi(err: unknown): RegisterFormErrors {
  if (err instanceof ApiError) {
    const mapped: RegisterFormErrors = {};
    for (const d of err.details ?? []) {
      const field = d.path[0];
      if (field === "name" || field === "email" || field === "password") mapped[field] = d.message;
    }
    return mapped;
  }
  return {};
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreeToS, setAgreeToS] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<RegisterFormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const errors = validateRegisterForm({ name, email, password, confirm });
    if (!agreeToS) errors.confirm = "You must agree to the Terms of Service";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setBusy(true);
    try {
      const referralCode = localStorage.getItem(REFERRAL_STORAGE_KEY) || undefined;
      await register(name.trim(), email.trim(), password, referralCode);
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError) {
        const apiErrors = errorsFromApi(err);
        if (Object.keys(apiErrors).length > 0) {
          setFieldErrors(apiErrors);
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : "Registration failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="One question a day. Ten minutes. Interview-ready.">
      <form onSubmit={onSubmit} className="form" noValidate>
        <ErrorBanner message={error} />
        <Field label="Name" error={fieldErrors.name}>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Email" error={fieldErrors.email}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>
        <Field label="Password" error={fieldErrors.password}>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          <span className="field-hint">{registerPasswordHint()}</span>
        </Field>
        <Field label="Confirm password" error={fieldErrors.confirm}>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </Field>
        <label className="checkbox-row">
          <input type="checkbox" checked={agreeToS} onChange={(e) => setAgreeToS(e.target.checked)} />
          <span>I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link></span>
        </label>
        <button className="btn btn-primary" disabled={busy} type="submit">
          {busy ? "Creating…" : "Create account"}
        </button>
        {/* Honeypot fields — hidden from humans, bots auto-fill them */}
        <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
          <input type="text" name="_website" tabIndex={-1} autoComplete="off" />
          <input type="text" name="_email_confirm" tabIndex={-1} autoComplete="off" />
        </div>
      </form>
      <div className="link-row">
        <Link to="/login">Already have an account?</Link>
      </div>
    </AuthShell>
  );
}
