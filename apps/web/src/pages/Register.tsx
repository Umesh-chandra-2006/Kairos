import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerPasswordHint, validateRegisterForm, type RegisterFormErrors } from "@kairos/shared";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { AuthShell, ErrorBanner, Field } from "../components/forms";

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
  const [fieldErrors, setFieldErrors] = useState<RegisterFormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const errors = validateRegisterForm({ name, email, password, confirm });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setBusy(true);
    try {
      await register(name.trim(), email.trim(), password);
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
        <button className="btn btn-primary" disabled={busy} type="submit">
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <div className="link-row">
        <Link to="/login">Already have an account?</Link>
      </div>
    </AuthShell>
  );
}
